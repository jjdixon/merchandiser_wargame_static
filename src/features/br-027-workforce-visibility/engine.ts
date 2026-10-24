// BR-027 Scheduled vs actual workforce visibility.
// At day start the schedule is snapshotted (who has which stop, planned times).
// Through the day each person — LF, Traditional, relief, jumper — shows what they
// were scheduled for vs what they're doing: stops added or taken away, where they
// are now, progress, time by activity, pull-ups and second/extra visits.
import {
  allPlans, featureState, plan, status,
  type EngineFeature, type Merchandiser, type SimState, type StatusKind,
} from '../../engine';
import { seed } from '../../data';

export const ID = 'br-027-workforce-visibility';
const SEED_STORES = new Set(seed.stores.map(s => s.id));

export interface Planned { storeId: string; merchId: string | null; start: number; end: number }
interface Snap { planned: Planned[] }
export const snapshot = (state: SimState) => featureState<Snap>(state, ID, () => ({ planned: [] }));

export function takeSnapshot(state: SimState): void {
  const snap = snapshot(state);
  snap.planned = state.stores.map(s => ({ storeId: s.id, merchId: s.assign, start: 0, end: 0 }));
  for (const p of allPlans(state)) for (const x of p.stops) {
    const row = snap.planned.find(r => r.storeId === x.s.id);
    if (row) { row.start = x.start; row.end = x.end }
  }
}

export interface Row {
  m: Merchandiser;
  scheduled: Planned[];
  /** Stops now on their route that weren't scheduled for them, and the reverse. */
  added: string[]; removed: string[];
  status: StatusKind; where: string;
  done: number; total: number;
  /** Minutes so far / planned for the whole day. */
  workSoFar: number; waitSoFar: number; driveSoFar: number;
  workPlan: number; waitPlan: number; drivePlan: number;
  firstPlanned: number | null; firstActual: number | null;
  pullUps: number; extraVisits: number; late: number;
}

const clip = (a: number, b: number, t: number) => Math.max(0, Math.min(b, t) - a);

export function rows(state: SimState, who: (m: Merchandiser) => boolean = () => true): Row[] {
  if (!snapshot(state).planned.length) takeSnapshot(state);    // switched on mid-day
  const snap = snapshot(state).planned;
  return state.merch.filter(who).map(m => {
    const p = plan(state, m), st = status(state, p);
    const scheduled = snap.filter(r => r.merchId === m.id);
    const mine = new Set(p.stops.map(x => x.s.id)), was = new Set(scheduled.map(r => r.storeId));
    const done = p.stops.filter(x => x.s.lock && state.t >= x.end).length;
    let workSoFar = 0, waitSoFar = 0, driveSoFar = 0;
    for (const x of p.stops) { driveSoFar += clip(x.depart, x.arrive, state.t); waitSoFar += clip(x.arrive, x.start, state.t); workSoFar += clip(x.start, x.end, state.t) }
    const lockedFirst = p.stops.find(x => x.s.lock);
    return {
      m, scheduled,
      added: [...mine].filter(id => !was.has(id)), removed: [...was].filter(id => !mine.has(id)),
      status: st.k, where: st.label, done, total: p.stops.length,
      workSoFar, waitSoFar, driveSoFar, workPlan: p.work, waitPlan: p.wait, drivePlan: p.dB + p.dF,
      firstPlanned: scheduled.length ? Math.min(...scheduled.map(r => r.start).filter(Boolean)) : null,
      firstActual: lockedFirst?.s.lock?.start ?? null,
      pullUps: p.stops.filter(x => x.s.pullUp && SEED_STORES.has(x.s.id)).length,
      extraVisits: p.stops.filter(x => !SEED_STORES.has(x.s.id)).length,
      late: p.late.length,
    };
  }).filter(r => r.total > 0 || r.scheduled.length > 0 || r.m.role !== 'merchandiser');
}

/** Stores scheduled at day start that nobody has now. */
export const dropped = (state: SimState) => snapshot(state).planned.filter(r => r.merchId && !state.stores.find(s => s.id === r.storeId)?.assign);

export const ROLE_ORDER = ['merchandiser', 'relief', 'jumper'];

export const br027WorkforceVisibilityEngine: EngineFeature = {
  id: ID,
  title: 'Scheduled vs actual workforce',
  description: 'Everyone on the Supervisor screen — LF, Traditional, relief, jumper — scheduled vs actual: changes, where they are, progress, time by activity, pull-ups and extra visits.',
  requirements: ['BR-027'],
  defaultOn: true,
  onDayStart: takeSnapshot,
};
