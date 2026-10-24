// BR-017 Order and load adjustment visibility.
// After the warehouse validates the load, some orders get cut (short) or added to.
// Each change is pushed to the merchandiser and the MSL, and the Scheduler shows
// ordered vs delivered trays and cases, and fill rate. A share of stores get a repeatable
// change about 90 minutes before the truck; the facilitator can also throw one.
import {
  adjustWork, featureState, fmt, hash01, merchById, pickShare, raise, ruleNum, workMin,
  type Curveball, type EngineFeature, type SimState, type Store,
} from '../../engine';

export const ID = 'br-017-load-adjustments';
const PCT = 'br017.adjustPct';

export interface Units { trays: number; cases: number }
export interface Change { storeId: string; from: Units; to: Units; at: number; source: 'warehouse' | 'facilitator' }
interface LoadState { ordered: Record<string, Units>; checked: Record<string, true>; changes: Change[] }
export const loads = (state: SimState) => featureState<LoadState>(state, ID, () => ({ ordered: {}, checked: {}, changes: [] }));

/** What was ordered (the volume the day started with). */
export const ordered = (state: SimState, s: Store): Units => {
  const l = loads(state);
  if (l.ordered[s.id] == null) l.ordered[s.id] = { trays: s.trays, cases: s.cases };
  return l.ordered[s.id];
};
/** Delivered ÷ ordered, trays and cases together. */
export const fillRate = (state: SimState, s: Store) => {
  const o = ordered(state, s);
  return (s.cases + s.trays) / Math.max(1, o.cases + o.trays);
};

/** Scale a store's delivered trays and cases. A stop in progress gains or loses the labor. */
export function adjustLoad(state: SimState, s: Store, factor: number, source: Change['source']): void {
  if (s.lock && state.t >= s.lock.end) return;
  const o = ordered(state, s);
  const from = { trays: s.trays, cases: s.cases }, before = workMin(state, s);
  s.trays = Math.max(0, Math.round(s.trays * factor));
  s.cases = Math.max(0, Math.round(s.cases * factor));
  if (s.lock) adjustWork(state, s, workMin(state, s) - before);
  loads(state).changes.push({ storeId: s.id, from, to: { trays: s.trays, cases: s.cases }, at: state.t, source });
  const m = merchById(state, s.assign ?? ''), d = s.trays + s.cases - from.trays - from.cases;
  raise(state, d < 0 ? 'warn' : 'info',
    `Load ${d < 0 ? 'cut' : 'add'} for ${s.name}: ordered ${o.trays} trays · ${o.cases} cases, now ${s.trays} · ${s.cases} (${d > 0 ? '+' : ''}${d} units). ${m ? `${m.name} and ` : ''}MSL${s.market ? ' ' + s.market : ''} notified at ${fmt(state.t)}.`);
}

/** Repeatable warehouse change for this store today: a fraction like −0.2 or +0.1, or 0. */
export function warehouseChange(state: SimState, s: Store): number {
  if (s.id.startsWith('x') || s.pullUp) return 0;
  const ids = state.stores.filter(x => !x.id.startsWith('x')).map(x => x.id);
  if (!pickShare(ids, `${state.scenario}|load`, ruleNum(state.rules, PCT, 15)).has(s.id)) return 0;
  const u = hash01(`${s.id}|load-size`);
  return u < 0.7 ? -(0.1 + u * 0.3) : 0.1 + (u - 0.7) * 0.5;   // mostly cuts
}

export const loadCurveball: Curveball = {
  id: 'load',
  label: 'Load cut / add after validation',
  targets: state => state.stores.filter(s => !(s.lock && state.t >= s.lock.end)).map(s => ({ value: s.id, label: s.name })),
  params: [{ id: 'pct', label: 'Change', default: '-20', options: [
    { value: '-40', label: 'Cut 40%' }, { value: '-20', label: 'Cut 20%' }, { value: '15', label: 'Add 15%' }, { value: '30', label: 'Add 30%' },
  ] }],
  apply(state, target, params) {
    const s = state.stores.find(x => x.id === target);
    if (s) adjustLoad(state, s, 1 + Number(params.pct ?? -20) / 100, 'facilitator');
  },
};

export const br017LoadAdjustmentsEngine: EngineFeature = {
  id: ID,
  title: 'Load cuts and adds',
  description: 'Warehouse cuts/adds after load validation reach the merchandiser and MSL; ordered vs delivered and fill rate per store.',
  requirements: ['BR-017', 'NR-001'],
  defaultOn: true,
  ruleDefaults: { [PCT]: 15 },
  settings: [{ key: PCT, label: 'Stores with a load change (%)', help: 'Share of orders cut or added after validation (repeatable)', type: 'number', step: 5, section: 'Trucks' }],
  curveballs: [loadCurveball],
  onTick(state) {
    const l = loads(state);
    for (const s of state.stores) {
      ordered(state, s);
      if (l.checked[s.id] || state.t < s.eta - 90) continue;
      l.checked[s.id] = true;
      const f = warehouseChange(state, s);
      if (f) adjustLoad(state, s, 1 + f, 'warehouse');
    }
  },
};
