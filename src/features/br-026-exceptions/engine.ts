// BR-026 Exception-based reporting.
// Every warning and problem raised during the day (by any feature) is captured,
// typed by its text (types.json), tied to the person and store it names, and kept
// for the week — plus, at the end of each day, stops that were never finished.
// Managers see counts by type and day and drill down to the stop.
import {
  DAYS, allPlans, weekState,
  type Alert, type EngineFeature, type Severity, type SimState,
} from '../../engine';
import TYPES from './types.json';

export const ID = 'br-026-exceptions';
export interface ExType { id: string; label: string; match: string[] }
export const EX_TYPES = TYPES.types as ExType[];
const RES = EX_TYPES.map(t => ({ t, re: t.match.map(m => new RegExp(m, 'i')) }));
export const OTHER: ExType = { id: 'other', label: 'Other', match: [] };

export interface Exception { day: number; t: number; sev: Severity; type: string; text: string; merchId: string | null; storeId: string | null }

export function typeOf(text: string): ExType | null {
  return RES.find(x => x.re.some(r => r.test(text)))?.t ?? null;
}

/** The person and store an alert names (longest store name first, so "#1042" beats a prefix). */
function who(state: SimState, text: string): { merchId: string | null; storeId: string | null } {
  const m = state.merch.find(x => text.includes(x.name)) ?? null;
  const s = [...state.stores].sort((a, b) => b.name.length - a.name.length).find(x => text.includes(x.name)) ?? null;
  return { merchId: m?.id ?? null, storeId: s ? s.id : null };
}

/** Info alerts of these types still count (e.g. a visit running long); other info is just news. */
const INFO_COUNTS = new Set(['geofence', 'visit', 'schedule', 'ordering']);

export function fromAlert(state: SimState, a: Alert): Exception | null {
  const type = typeOf(a.text);
  if (a.sev === 'info' && !(type && INFO_COUNTS.has(type.id))) return null;
  return { day: state.day, t: a.t, sev: a.sev, type: (type ?? OTHER).id, text: a.text, ...who(state, a.text) };
}

/** Today's exceptions so far, newest first. */
export const today = (state: SimState) => state.alerts.map(a => fromAlert(state, a)).filter((x): x is Exception => !!x);
export const history = (state: SimState) => weekState<Exception[]>(state, ID, () => []);

/** Stops still open at the end of the day. */
export function unfinished(state: SimState): Exception[] {
  const out: Exception[] = [];
  for (const p of allPlans(state)) for (const x of p.stops) if (!(x.s.lock && state.t >= x.end))
    out.push({ day: state.day, t: state.t, sev: 'bad', type: 'incomplete', text: `${x.s.name} not finished by ${p.m.name} at the end of the day.`, merchId: p.m.id, storeId: x.s.id });
  for (const s of state.stores) if (!s.assign) out.push({ day: state.day, t: state.t, sev: 'bad', type: 'incomplete', text: `${s.name} left undone: nobody was assigned.`, merchId: null, storeId: s.id });
  return out;
}

export function onDayEnd(state: SimState): void {
  history(state).push(...today(state), ...unfinished(state));
}

/** This week (finished days + today), with optional filters. */
export function week(state: SimState, f: { merchId?: string; storeId?: string; type?: string } = {}): Exception[] {
  return [...history(state), ...today(state)].filter(e => (!f.merchId || e.merchId === f.merchId) && (!f.storeId || e.storeId === f.storeId) && (!f.type || e.type === f.type));
}

/** Count by type × day. */
export function grid(list: Exception[]): Array<{ type: ExType; byDay: number[]; total: number }> {
  return [...EX_TYPES, OTHER].map(type => {
    const byDay = DAYS.map((_, d) => list.filter(e => e.type === type.id && e.day === d).length);
    return { type, byDay, total: byDay.reduce((a, b) => a + b, 0) };
  }).filter(r => r.total > 0).sort((a, b) => b.total - a.total);
}

export const br026ExceptionsEngine: EngineFeature = {
  id: ID,
  title: 'Exceptions report',
  description: 'Every warning and problem this week by type and day, with drill-down to person, store and stop; unfinished stops added at end of day.',
  requirements: ['BR-026'],
  defaultOn: true,
  onDayEnd,
};
