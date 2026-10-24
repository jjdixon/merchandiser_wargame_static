// BR-010 Schedule governance (+ BR-004 change history and notifications).
// Each day's schedule starts as a Draft the scheduler can rework freely. Publishing
// freezes a snapshot: who works each store and the planned start. After that, every
// change (store moved to someone else, start shifted) is logged with who did it, the
// affected people are notified, and changes that move a store away from its usual
// service time (customer consistency) are flagged.
import {
  DAYS, allPlans, fmt, merchById, raise, ruleBool, ruleNum, weekState,
  type EngineFeature, type SimState,
} from '../../engine';

export const ID = 'br-010-schedule-governance';
const AUTO = 'br010.autoPublish', SHIFT = 'br010.flagShiftMin';

export interface Snapshot { at: number; stops: Record<string, { assign: string | null; start: number }> }
export interface Change { day: number; at: number; storeId: string; storeName: string; kind: 'reassigned' | 'time moved'; from: string; to: string; usual: boolean }
interface Gov { published: Record<number, Snapshot>; changes: Change[]; seen: Record<string, string>; usual: Record<string, number[]> }
export const gov = (state: SimState) => weekState<Gov>(state, ID, () => ({ published: {}, changes: [], seen: {}, usual: {} }));

/** Planned start per store right now. */
function current(state: SimState): Snapshot['stops'] {
  const out: Snapshot['stops'] = {};
  for (const p of allPlans(state)) for (const x of p.stops) out[x.s.id] = { assign: p.m.id, start: Math.round(x.start) };
  for (const s of state.stores) if (!s.assign) out[s.id] = { assign: null, start: -1 };
  return out;
}

export const isPublished = (state: SimState) => !!gov(state).published[state.day];

export function publish(state: SimState, by: string): void {
  gov(state).published[state.day] = { at: state.t, stops: current(state) };
  raise(state, 'info', `${by} published the ${DAYS[state.day]} schedule. Changes from here on are logged and people are notified.`);
}

/** Average start on earlier days this week — the store's usual service time. */
export const usualStart = (state: SimState, storeId: string) => {
  const xs = gov(state).usual[storeId];
  return xs?.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null;
};

const name = (state: SimState, id: string | null) => (id ? merchById(state, id)?.name ?? id : 'nobody');

export function onTick(state: SimState): void {
  const g = gov(state);
  if (!g.published[state.day]) {
    if (ruleBool(state.rules, AUTO, true) && state.t >= state.rules.shiftStart + 1) publish(state, 'Auto');
    return;
  }
  const pub = g.published[state.day].stops, now = current(state), limit = ruleNum(state.rules, SHIFT, 30);
  for (const [id, c] of Object.entries(now)) {
    const s = state.stores.find(x => x.id === id)!, was = pub[id];
    if (!was) continue;                                       // new today (extra visit) — not a change
    const usual = usualStart(state, id);
    if (was.assign !== c.assign && g.seen[`${state.day}|${id}|a`] !== String(c.assign)) {
      g.seen[`${state.day}|${id}|a`] = String(c.assign);
      g.changes.push({ day: state.day, at: state.t, storeId: id, storeName: s.name, kind: 'reassigned', from: name(state, was.assign), to: name(state, c.assign), usual: false });
      raise(state, 'warn', `Published schedule changed: ${s.name} moved from ${name(state, was.assign)} to ${name(state, c.assign)}. Both notified.`);
    }
    if (c.start >= 0 && was.start >= 0 && Math.abs(c.start - was.start) > limit && !s.lock && g.seen[`${state.day}|${id}|t`] !== String(Math.round(c.start / 15))) {
      g.seen[`${state.day}|${id}|t`] = String(Math.round(c.start / 15));
      const off = usual != null && Math.abs(c.start - usual) > 60;
      g.changes.push({ day: state.day, at: state.t, storeId: id, storeName: s.name, kind: 'time moved', from: fmt(was.start), to: fmt(c.start), usual: off });
      raise(state, off ? 'bad' : 'info', `${s.name}: start moved ${fmt(was.start)} → ${fmt(c.start)}${off ? ` — away from its usual ${fmt(usual)} (customer consistency)` : ''}.`);
    }
  }
}

export const br010ScheduleGovernanceEngine: EngineFeature = {
  id: ID,
  title: 'Schedule governance',
  description: 'Draft → published schedule per day; after publishing every change is logged, people are notified, and moves away from a store\'s usual time are flagged.',
  requirements: ['BR-010', 'BR-004'],
  defaultOn: true,
  ruleDefaults: { [AUTO]: true, [SHIFT]: 30 },
  settings: [
    { key: AUTO, label: 'Publish automatically at shift start', help: 'Off = the scheduler must press Publish', type: 'boolean', section: 'Schedule' },
    { key: SHIFT, label: 'Log a start-time change over (min)', help: 'Smaller moves aren\'t treated as schedule changes', type: 'number', step: 5, section: 'Schedule' },
  ],
  onTick,
  onDayEnd(state) {
    const g = gov(state);
    for (const p of allPlans(state)) for (const x of p.stops) (g.usual[x.s.id] ??= []).push(Math.round(x.start));
  },
};
