// BR-007 Hours, availability and overtime control.
// Each person has a weekly guaranteed minimum and a maximum. The schedule shows
// worked and remaining hours; schedulers are warned before someone reaches the
// maximum; and when someone actually hits it, their remaining stops are released
// for coverage (switchable) and the supervisor records why the work was unfinished.
import {
  DAYS, allPlans, featureState, fmt, paidSoFar, plan, raise, ruleBool, ruleNum,
  type EngineFeature, type Merchandiser, type SimState,
} from '../../engine';
import LIMITS from './limits.json';

export const ID = 'br-007-hours-guarantees';
const ENFORCE = 'br007.enforceMax', WARN = 'br007.warnWithin';
export const REASONS: string[] = LIMITS.reasons;

export function limitsFor(m: Merchandiser): { guarantee: number; max: number } {
  return (LIMITS.byPerson as Record<string, { guarantee: number; max: number }>)[m.id]
    ?? (LIMITS.byRole as Record<string, { guarantee: number; max: number }>)[m.role] ?? { guarantee: 32, max: 40 };
}

export interface Unfinished { merchId: string; day: number; at: number; stores: string[]; reason?: string }
interface HoursState { unfinished: Unfinished[] }
export const hoursState = (state: SimState) => featureState<HoursState>(state, ID, () => ({ unfinished: [] }));

/** Worked so far this week (incl. today up to now) and planned by the end of today. */
export function hoursNow(state: SimState, m: Merchandiser) {
  const p = plan(state, m);
  return { worked: m.week + paidSoFar(state, p) / 60, endOfToday: p.weekProj, ...limitsFor(m) };
}

export function onTick(state: SimState): void {
  const warnWithin = ruleNum(state.rules, WARN, 2);
  for (const p of allPlans(state)) {
    const m = p.m, h = hoursNow(state, m);
    if (h.endOfToday > h.max - warnWithin && h.endOfToday <= h.max)
      raise(state, 'warn', `${m.name} will reach ${h.endOfToday.toFixed(1)} of ${h.max} max hours today — ${(h.max - h.endOfToday).toFixed(1)} h left this week.`, `${ID}:near:${m.id}:${state.day}`);
    if (h.endOfToday > h.max)
      raise(state, 'warn', `${m.name} is scheduled past the ${h.max}-hour maximum (${h.endOfToday.toFixed(1)} h by end of ${DAYS[state.day]}).`, `${ID}:over:${m.id}:${state.day}`);
    // Actually at the maximum: release what's left (if enforced) and ask why.
    if (h.worked >= h.max && ruleBool(state.rules, ENFORCE, true)) {
      const open = state.stores.filter(s => s.assign === m.id && !s.lock);
      if (!open.length) continue;
      open.forEach(s => (s.assign = null));
      hoursState(state).unfinished.push({ merchId: m.id, day: state.day, at: state.t, stores: open.map(s => s.name) });
      raise(state, 'bad', `${m.name} hit the ${h.max}-hour maximum at ${fmt(state.t)}. ${open.length} stop${open.length > 1 ? 's' : ''} released for coverage — record why it was unfinished.`);
    }
  }
}

export function explain(state: SimState, index: number, reason: string): void {
  const u = hoursState(state).unfinished[index];
  if (u) u.reason = reason;
}

export const br007HoursGuaranteesEngine: EngineFeature = {
  id: ID,
  title: 'Hours guarantees',
  description: 'Weekly guaranteed and maximum hours per person; warnings before the max; at the max, remaining stops are released and the reason recorded.',
  requirements: ['BR-007'],
  defaultOn: true,
  ruleDefaults: { [ENFORCE]: true, [WARN]: 2 },
  settings: [
    { key: ENFORCE, label: 'Stop work at the weekly maximum', help: 'Release remaining stops for coverage when someone hits their max', type: 'boolean', section: 'Hours' },
    { key: WARN, label: 'Warn when within (hours) of the max', help: 'Scheduler heads-up before the limit', type: 'number', step: 0.5, section: 'Hours' },
  ],
  onTick,
};
