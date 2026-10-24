// BR-043 Reporting, dashboards and centralized photo review.
// - Photo review queue: every display result that came with a photo and hasn't been
//   reviewed, suspected non-compliance first (recognition says non-compliant or
//   partial, recognition disagrees with what was reported, low confidence).
//   Reviewing writes a core review event, so compliance (BR-040) follows.
// - Display dashboard: planned, due, completed, overdue, absent, compliant and
//   non-compliant, and the compliance rate against a goal, by merchandiser, store,
//   banner, market, route type or day.
import {
  DAYS, RATED, bannerOf, displayEvents, displayStatus, dueAction, merchById, overdueDays, reviewDisplay, ruleNum,
  type DisplayEvent, type DisplayResult, type EngineFeature, type SimState,
} from '../../engine';

export const ID = 'br-043-photo-review';
export const GOAL = 'br043.goal';

export interface QueueItem { ev: DisplayEvent; score: number; why: string[] }

const reviewedAfter = (all: DisplayEvent[], e: DisplayEvent) =>
  all.some(r => r.action === 'review' && r.taskId === e.taskId && (r.day > e.day || (r.day === e.day && r.t >= e.t)));

export function queue(state: SimState, store: (id: string) => boolean = () => true): QueueItem[] {
  const all = displayEvents(state);
  return all.filter(e => e.action !== 'review' && e.photo && store(e.storeId) && !reviewedAfter(all, e)).map(ev => {
    const rec = ev.photo!.recognition, why: string[] = [];
    let score = 0;
    if (rec?.compliance === 'non-compliant') { score += 3; why.push('recognition: non-compliant') }
    else if (rec?.compliance === 'partially compliant') { score += 2; why.push('recognition: partial') }
    if (rec && rec.compliance !== ev.result && ev.result === 'compliant') { score += 2; why.push(`reported ${ev.result}, recognition says ${rec.compliance}`) }
    if (rec && rec.confidence < 70) { score += 1; why.push(`low confidence (${rec.confidence}%)`) }
    if (ev.result === 'non-compliant' || ev.result === 'partially compliant') { score += 1; why.push(`reported ${ev.result}`) }
    return { ev, score, why };
  }).sort((a, b) => b.score - a.score || b.ev.day - a.ev.day || b.ev.t - a.ev.t);
}

export function review(state: SimState, ev: DisplayEvent, result: DisplayResult, by: string, note?: string) {
  return reviewDisplay(state, ev.taskId, result, by, note);
}

export type Dimension = 'merchandiser' | 'store' | 'banner' | 'market' | 'routeType' | 'day';
export const DIMENSIONS: Array<[Dimension, string]> = [['merchandiser', 'Merchandiser'], ['store', 'Store'], ['banner', 'Banner'], ['market', 'Market'], ['routeType', 'Route type'], ['day', 'Day']];

export interface Row { key: string; planned: number; due: number; completed: number; overdue: number; absent: number; compliant: number; nonCompliant: number; rated: number; rate: number | null }
const empty = (key: string): Row => ({ key, planned: 0, due: 0, completed: 0, overdue: 0, absent: 0, compliant: 0, nonCompliant: 0, rated: 0, rate: null });

/** Today's picture of every live display task, grouped. 'day' groups this week's results by the day recorded. */
export function dashboard(state: SimState, dim: Dimension, store: (id: string) => boolean = () => true): Row[] {
  const rows = new Map<string, Row>();
  const get = (k: string) => { if (!rows.has(k)) rows.set(k, empty(k)); return rows.get(k)! };
  const bump = (r: Row, res: DisplayResult | null) => {
    if (res === 'absent') r.absent++;
    if (res === 'compliant') r.compliant++;
    if (res === 'non-compliant' || res === 'partially compliant') r.nonCompliant++;
    if (res && RATED.includes(res)) r.rated++;
  };
  if (dim === 'day') {
    // Latest result per task per day.
    const latest = new Map<string, DisplayEvent>();
    for (const e of displayEvents(state)) if (store(e.storeId)) latest.set(`${e.day}|${e.taskId}`, e);
    for (const e of latest.values()) { const r = get(DAYS[e.day] ?? String(e.day)); r.completed++; bump(r, e.result) }
  } else {
    for (const t of state.displays.tasks) {
      if (!store(t.storeId) || t.start > state.day) continue;
      const s = state.stores.find(x => x.id === t.storeId);
      const key = dim === 'merchandiser' ? (merchById(state, s?.assign ?? '')?.name ?? 'Not visited today')
        : dim === 'store' ? (s?.name ?? t.storeId) : dim === 'banner' ? bannerOf(s ?? { name: t.storeId })
        : dim === 'market' ? (s?.market || '—') : (s?.routeType ?? '—');
      const r = get(key), st = displayStatus(state, t);
      const due = !!dueAction(state, t);
      if (state.day <= t.end || due) r.planned++;
      if (due) r.due++;
      if (st.events.some(e => e.day === state.day && e.action !== 'review')) r.completed++;
      if (overdueDays(state, t)) r.overdue++;
      bump(r, st.result);
    }
  }
  const out = [...rows.values()].map(r => ({ ...r, rate: r.rated ? r.compliant / r.rated : null }));
  return dim === 'day' ? out.sort((a, b) => DAYS.indexOf(a.key) - DAYS.indexOf(b.key)) : out.sort((a, b) => (a.rate ?? 2) - (b.rate ?? 2) || a.key.localeCompare(b.key));
}

export function total(rows: Row[]): Row {
  const t = rows.reduce((a, r) => ({ ...a, planned: a.planned + r.planned, due: a.due + r.due, completed: a.completed + r.completed, overdue: a.overdue + r.overdue, absent: a.absent + r.absent, compliant: a.compliant + r.compliant, nonCompliant: a.nonCompliant + r.nonCompliant, rated: a.rated + r.rated }), empty('All'));
  return { ...t, rate: t.rated ? t.compliant / t.rated : null };
}

export const goal = (state: SimState) => ruleNum(state.rules, GOAL, 80) / 100;

export const br043PhotoReviewEngine: EngineFeature = {
  id: ID,
  title: 'Photo review and display dashboard',
  description: 'One queue to review display photos (suspected non-compliance first) and a display compliance dashboard against a goal.',
  requirements: ['BR-043'],
  defaultOn: true,
  ruleDefaults: { [GOAL]: 80 },
  settings: [{ key: GOAL, label: 'Display compliance goal (%)', help: 'Today it is roughly 30–50%; the program target is 80%+', type: 'number', step: 5, section: 'Displays' }],
};
