// NR-003 Order feedback (light / heavy).
// MSLs own ordering. Before leaving a store the merchandiser tells them whether
// today's order was light, about right or heavy — separately for trays and cases.
// The app suggests an answer from the merchandiser's position, so the call is
// consistent and the MSL can see why:
//
//   on hand  = today's delivery + backstock found on arrival (NR-002, if counted)
//   need     = average daily sales × selling days until the next delivery
//   coverage = on hand ÷ need
//   heavy  if coverage > 1 + tolerance, or what's left in the back is more than
//          tolerance × need (it didn't fit)
//   light  if coverage < 1 − tolerance, or out-of-stocks were found and coverage < 1
//
// The merchandiser can disagree; the MSL sees both. Anything not "about right"
// goes to the store's MSL. Down-day pull-ups get no feedback step (no order to judge).
import {
  DAYS, featureState, merchById, raise, ruleNum, visitOn, visitSteps, weekState,
  type EngineFeature, type SimState, type StepAnswer, type Store, type Units, type VisitStep,
} from '../../engine';
import { seed } from '../../data';
import SALES from './sales.json';

export const ID = 'nr-003-order-feedback';
export const TOL = 'nr003.tolerance';
export const OPTIONS = ['Light', 'About right', 'Heavy'] as const;
export type Call = typeof OPTIONS[number];
type Unit = keyof Units;
export const UNITS: Unit[] = ['trays', 'cases'];
export const stepId = (u: Unit) => `${ID}:${u}`;

const SALES_BY_STORE = SALES.byStore as Record<string, Units>;
export const avgDailySales = (s: Store): Units => SALES_BY_STORE[s.id] ?? { trays: s.trays, cases: s.cases };

/** Selling days until this store's next delivery (1 = tomorrow), using the weekly patterns. */
export function daysToNextDelivery(state: SimState, s: Store): { days: number; day: string } {
  for (let d = 1; d <= 7; d++) {
    const day = (state.day + d) % 7;
    if (visitOn(s, day, seed.week) === 'delivery') return { days: d, day: DAYS[day] };
  }
  return { days: 7, day: DAYS[state.day] };
}

export interface Suggestion { unit: Unit; call: Call; onHand: number; need: number; left: number | null; coverage: number; why: string }

/**
 * Out-of-stocks recorded today on any entries step in the out-of-stock phase.
 * (Reading the visit's steps builds ours too, which asks for a suggestion — the
 * guard stops that loop; the inner call just skips the out-of-stock nudge.)
 */
let reading = false;
function oosFound(state: SimState, s: Store): number {
  if (reading) return 0;
  reading = true;
  try { return countOos(state, s) } finally { reading = false }
}
function countOos(state: SimState, s: Store): number {
  return visitSteps(state, s).filter(x => x.phase === 'oos' && x.kind === 'entries')
    .reduce((n, x) => n + (s.answers[x.id]?.entries?.length ?? 0), 0);
}

export function suggest(state: SimState, s: Store, unit: Unit): Suggestion {
  const tol = ruleNum(state.rules, TOL, 25) / 100;
  const start = s.backstock?.start?.[unit] ?? 0, left = s.backstock?.end?.[unit] ?? null;
  const next = daysToNextDelivery(state, s);
  const onHand = s[unit] + start, need = Math.max(1, avgDailySales(s)[unit] * next.days);
  const coverage = onHand / need, oos = oosFound(state, s);
  let call: Call = 'About right', reason = '';
  if (left != null && left > tol * need) { call = 'Heavy'; reason = `${left} ${unit} didn't fit and are still in the back` }
  else if (coverage > 1 + tol) { call = 'Heavy'; reason = `about ${Math.round((coverage - 1) * 100)}% more than will sell` }
  else if (coverage < 1 - tol) { call = 'Light'; reason = `about ${Math.round((1 - coverage) * 100)}% short of what will sell` }
  else if (oos > 0 && coverage < 1) { call = 'Light'; reason = `${oos} out-of-stock${oos > 1 ? 's' : ''} found and on hand is below sales` }
  const why = `${onHand} on hand (${s[unit]} delivered + ${start} in back) vs ~${Math.round(need)} selling until ${next.day}'s truck`
    + ` (${next.days} day${next.days > 1 ? 's' : ''} × ${avgDailySales(s)[unit]}/day)${reason ? ` — ${reason}` : ''}.`;
  return { unit, call, onHand, need, left, coverage, why };
}

export function steps(state: SimState, s: Store): VisitStep[] {
  if (s.pullUp) return [];
  return UNITS.map((u, i) => {
    const sg = suggest(state, s, u);
    return {
      id: stepId(u), featureId: ID, phase: 'closeout', order: 20 + i, kind: 'choice', required: true, needsProduct: true,
      options: [...OPTIONS], title: `Today's ${u} order for the MSL`,
      detail: `Suggested: ${sg.call}. ${sg.why}`,
      autoAnswer: (st, x) => ({ choice: suggest(st, x, u).call }),
    };
  });
}

/** Today's feedback, kept in day state; rolled into week state when the day ends. */
export interface Feedback { storeId: string; unit: Unit; call: Call; suggested: Call; why: string; by: string; at: number; auto: boolean; market: string }
export const today = (state: SimState) => featureState<Feedback[]>(state, ID, () => []);
export const week = (state: SimState) => weekState<Array<Feedback & { day: number }>>(state, ID, () => []);

export function onStepAnswered(state: SimState, s: Store, step: VisitStep, a: StepAnswer): void {
  const unit = UNITS.find(u => stepId(u) === step.id);
  if (!unit || !a.choice) return;
  const sg = suggest(state, s, unit), m = merchById(state, s.assign ?? '');
  const list = today(state), old = list.findIndex(f => f.storeId === s.id && f.unit === unit);
  if (old >= 0) list.splice(old, 1);
  const fb: Feedback = { storeId: s.id, unit, call: a.choice as Call, suggested: sg.call, why: sg.why, by: m?.name ?? 'Merchandiser', at: state.t, auto: !!a.auto, market: s.market };
  list.push(fb);
  if (fb.call !== 'About right') {
    raise(state, 'info', `Order feedback to MSL${s.market ? ' ' + s.market : ''}: ${s.name} ${unit} ${fb.call.toLowerCase()}${fb.call !== fb.suggested ? ` (app suggested ${fb.suggested.toLowerCase()})` : ''} — from ${fb.by}.`, `${ID}:${s.id}:${unit}`);
  }
}

export function onDayEnd(state: SimState): void {
  week(state).push(...today(state).map(f => ({ ...f, day: state.day })));
}

/** This week's not-"about right" calls per store and unit, for the trend. */
export function weekTally(state: SimState, storeId: string): Record<Unit, { light: number; heavy: number }> {
  const t = { trays: { light: 0, heavy: 0 }, cases: { light: 0, heavy: 0 } };
  for (const f of [...week(state), ...today(state).map(x => ({ ...x, day: state.day }))]) {
    if (f.storeId !== storeId) continue;
    if (f.call === 'Light') t[f.unit].light++; else if (f.call === 'Heavy') t[f.unit].heavy++;
  }
  return t;
}

export const nr003OrderFeedbackEngine: EngineFeature = {
  id: ID,
  title: 'Order feedback (light / heavy)',
  description: 'Before leaving, the merchandiser tells the MSL whether today\'s trays and cases order was light, about right or heavy — with a suggestion from on-hand, next delivery and average sales.',
  requirements: ['NR-003'],
  defaultOn: true,
  ruleDefaults: { [TOL]: 25 },
  settings: [
    { key: TOL, label: 'Light / heavy tolerance (%)', help: 'How far on-hand can be from expected sales before the app suggests light or heavy', type: 'number', step: 5, section: 'Ordering' },
  ],
  visitSteps: steps,
  onStepAnswered,
  onDayEnd,
};
