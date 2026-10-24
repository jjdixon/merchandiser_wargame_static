// BR-006 Workload optimization and route jumping.
// Finds stops at risk (projected past their done-by time, or uncovered with product
// ready) and recommends who can help: the route jumper first, then anyone idle,
// qualified for that route type, with hours left. "Send help" splits the remaining
// work (half by default) to the helper. The push-button "optimize the rest of the
// day" is the Scheduler's Auto-assign.
import {
  allPlans, dist, driveMin, fmt, plan, raise, readyAt, splitWork, status,
  type EngineFeature, type Merchandiser, type SimState, type Store,
} from '../../engine';

export const ID = 'br-006-route-jumping';
const MAX_WEEK = 40;

export interface Helper { merchId: string; name: string; arrive: number; jumper: boolean }
export interface Risk { store: Store; reason: 'late' | 'uncovered'; finish: number | null; helpers: Helper[] }

/** When this person could get to the store, if they dropped nothing else. */
function arrival(state: SimState, m: Merchandiser, s: Store): number {
  const p = plan(state, m), st = status(state, p);
  const lastOpen = p.stops.filter(x => x.end > state.t);
  const from = lastOpen.length ? lastOpen[lastOpen.length - 1].s.xy : st.pos ?? m.home;
  const free = lastOpen.length ? lastOpen[lastOpen.length - 1].end : state.t;
  return Math.max(free + driveMin(state.rules, dist(state.rules, from, s.xy)), readyAt(state, s));
}

export function helpersFor(state: SimState, s: Store): Helper[] {
  return state.merch
    .filter(m => !m.out && m.id !== s.assign && m.routeTypes.includes(s.routeType) && plan(state, m).weekProj < MAX_WEEK)
    .map(m => ({ merchId: m.id, name: m.name, arrive: Math.round(arrival(state, m, s)), jumper: m.role === 'jumper' }))
    .filter(h => h.arrive < s.win + 120)
    .sort((a, b) => Number(b.jumper) - Number(a.jumper) || a.arrive - b.arrive)
    .slice(0, 3);
}

export function risks(state: SimState): Risk[] {
  const out: Risk[] = [];
  for (const p of allPlans(state)) for (const x of p.stops)
    if (x.end > x.s.win && state.t < x.end && !x.s.id.includes('~help')) out.push({ store: x.s, reason: 'late', finish: x.end, helpers: helpersFor(state, x.s) });
  for (const s of state.stores)
    if (!s.assign && !(s.lock && state.t >= s.lock.end)) out.push({ store: s, reason: 'uncovered', finish: null, helpers: helpersFor(state, s) });
  return out.filter(r => r.helpers.length);
}

export function sendHelp(state: SimState, storeId: string, helperId: string, share = 0.5): Store | null {
  const s = state.stores.find(x => x.id === storeId);
  if (!s) return null;
  if (!s.assign) { s.assign = helperId; s.seq = 99; raise(state, 'info', `${s.name} covered by ${state.merch.find(m => m.id === helperId)?.name}.`); return s }
  const n = splitWork(state, s, helperId, share, 'help');
  if (n) raise(state, 'info', `${state.merch.find(m => m.id === helperId)?.name} sent to help at ${s.name} (${n.trays} trays · ${n.cases} cases).`);
  return n;
}

export const br006RouteJumpingEngine: EngineFeature = {
  id: ID,
  title: 'Route jumping',
  description: 'Finds stops at risk and recommends help (route jumper first, then anyone idle and qualified); "Send help" splits the remaining work.',
  requirements: ['BR-006'],
  defaultOn: true,
  onTick(state) {
    for (const r of risks(state)) {
      const h = r.helpers[0];
      raise(state, 'info', `Help available for ${r.store.name}${r.reason === 'late' ? ` (projected ${fmt(r.finish)}, due ${fmt(r.store.win)})` : ' (uncovered)'}: ${h.name}${h.jumper ? ' (route jumper)' : ''} can be there by ${fmt(h.arrive)}.`, `${ID}:${r.store.id}`);
    }
  },
};
