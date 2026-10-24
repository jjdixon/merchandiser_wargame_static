// BR-014 Truck delivery visibility.
// Every stop has a delivery status (scheduled / en route / late / delivered) against
// the scheduled truck time. Carriers run late on some days: a share of trucks get a
// repeatable delay that dispatch reveals about 45 minutes before the scheduled time,
// the way an upstream late-truck feed would. When a truck to a stop the merchandiser
// hasn't left for yet slips, they get a heads-up *before* leaving, with the updated
// leave time.
import {
  delayTruck, featureState, fmt, hash01, merchById, parseHHMM, pickShare, plan, raise, ruleNum,
  type EngineFeature, type SimState, type Store,
} from '../../engine';
import SEED_STORES from '../../data/stores.json';

export const ID = 'br-014-truck-visibility';
const PCT = 'br014.lateTruckPct';
const REVEAL_BEFORE = 45;

const SCHEDULED: Record<string, number> = Object.fromEntries(SEED_STORES.map(s => [s.id, parseHHMM(s.truckEta)]));

export interface Notice { merchId: string; storeId: string; at: number; text: string }
interface TruckState { scheduled: Record<string, number>; revealed: Record<string, true>; notified: Record<string, number>; notices: Notice[] }
export const trucks = (state: SimState) =>
  featureState<TruckState>(state, ID, () => ({ scheduled: {}, revealed: {}, notified: {}, notices: [] }));

/** Scheduled truck time: the seed's time (so scenario delays count as late), else first seen. */
export function scheduledEta(state: SimState, s: Store): number {
  const t = trucks(state);
  if (t.scheduled[s.id] == null) t.scheduled[s.id] = SCHEDULED[s.id] ?? s.eta;
  return t.scheduled[s.id];
}

/** Minutes of carrier delay this truck will have today (0 for most). Repeatable. */
export function carrierDelay(state: SimState, s: Store): number {
  if (s.id.startsWith('x')) return 0;
  const ids = SEED_STORES.map(x => x.id);
  if (!pickShare(ids, `${state.scenario}|late`, ruleNum(state.rules, PCT, 20)).has(s.id)) return 0;
  return 20 + Math.floor(hash01(`${s.id}|late-min`) * 70);
}

export type TruckStatus = 'scheduled' | 'en route' | 'late' | 'delivered';
export function truckStatus(state: SimState, s: Store): { status: TruckStatus; lateBy: number } {
  const lateBy = Math.max(0, Math.round(s.eta - scheduledEta(state, s)));
  if (state.t >= s.eta) return { status: 'delivered', lateBy };
  if (lateBy > 5) return { status: 'late', lateBy };
  return { status: state.t >= s.eta - 120 ? 'en route' : 'scheduled', lateBy };
}

export function onTick(state: SimState): void {
  const t = trucks(state);
  for (const s of state.stores) {
    const sched = scheduledEta(state, s);
    // Dispatch reveals the carrier's delay ahead of the scheduled time.
    if (!t.revealed[s.id] && state.t >= sched - REVEAL_BEFORE) {
      t.revealed[s.id] = true;
      const d = carrierDelay(state, s);
      if (d > 0 && !(s.lock && state.t >= s.lock.start)) {
        delayTruck(state, s, d);
        raise(state, 'warn', `Carrier update: truck to ${s.name} now ${fmt(s.eta)} (+${d} min).`, `${ID}:late:${s.id}`);
      }
    }
    // Heads-up to the merchandiser before they leave for a stop whose truck slipped.
    if (s.assign && !s.lock && s.eta - sched > 5 && t.notified[s.id] !== s.eta) {
      t.notified[s.id] = s.eta;
      const m = merchById(state, s.assign);
      if (!m) continue;
      const stop = plan(state, m).stops.find(x => x.s.id === s.id);
      const text = `Truck to ${s.name} is now ${fmt(s.eta)} (${Math.round(s.eta - sched)} min late). Leave at ${fmt(stop?.depart)} instead.`;
      t.notices.push({ merchId: m.id, storeId: s.id, at: state.t, text });
      raise(state, 'info', `${m.name} notified before leaving: ${text}`, `${ID}:notice:${s.id}:${s.eta}`);
    }
  }
}

export const br014TruckVisibilityEngine: EngineFeature = {
  id: ID,
  title: 'Truck visibility',
  description: 'Delivery status per stop, carrier delays revealed during the day, and a heads-up to the merchandiser before they leave.',
  requirements: ['BR-014'],
  defaultOn: true,
  ruleDefaults: { [PCT]: 20 },
  settings: [{ key: PCT, label: 'Trucks running late (%)', help: 'Share of trucks the carrier delays 20–90 min (repeatable)', type: 'number', step: 5, section: 'Trucks' }],
  onTick,
};
