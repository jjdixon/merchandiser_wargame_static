// BR-011 Automatic store presence and geofence exceptions.
// The phone records store entry and exit automatically (no manual check-in). Some
// events go wrong (GPS drift, phone off, signal in the back room), and those become
// exceptions in a review queue for a supervisor to accept or reject. A share of
// visits get a repeatable problem; the facilitator can also drop an event.
import {
  featureState, fmt, hash01, merchById, pickShare, raise, ruleNum,
  type Curveball, type EngineFeature, type SimState, type Store,
} from '../../engine';

export const ID = 'br-011-geofence-exceptions';
const PCT = 'br011.failPct';

export type Problem = 'missing entry' | 'missing exit' | 'late entry';
export interface Presence { storeId: string; merchId: string; entry: number | null; exit: number | null; expectedEntry: number; expectedExit: number }
export interface Exception {
  id: number; storeId: string; merchId: string; problem: Problem; expected: number; recorded: number | null;
  /** Paid minutes that depend on the decision. */
  minutes: number; status: 'open' | 'accepted' | 'rejected'; decidedAt?: number;
}
interface GeoState { presence: Record<string, Presence>; exceptions: Exception[]; forced: Record<string, Problem>; nextId: number }
export const geo = (state: SimState) => featureState<GeoState>(state, ID, () => ({ presence: {}, exceptions: [], forced: {}, nextId: 1 }));

/** Today's repeatable problem for this visit, if any. */
export function plannedProblem(state: SimState, s: Store): Problem | null {
  const forced = geo(state).forced[s.id];
  if (forced) return forced;
  const ids = state.stores.filter(x => !x.id.startsWith('x')).map(x => x.id);
  if (!pickShare(ids, `${state.scenario}|geo`, ruleNum(state.rules, PCT, 10)).has(s.id)) return null;
  const u = hash01(`${s.id}|geo-kind`);
  return u < 0.3 ? 'missing entry' : u < 0.7 ? 'missing exit' : 'late entry';
}

function flag(state: SimState, s: Store, p: Presence, problem: Problem): void {
  const g = geo(state);
  if (g.exceptions.some(e => e.storeId === s.id && e.problem === problem)) return;
  const late = p.entry != null ? Math.round(p.entry - p.expectedEntry) : 0;
  const minutes = problem === 'late entry' ? late : Math.round(p.expectedExit - p.expectedEntry);
  g.exceptions.push({ id: g.nextId++, storeId: s.id, merchId: p.merchId, problem, status: 'open', minutes,
    expected: problem === 'missing exit' ? p.expectedExit : p.expectedEntry,
    recorded: problem === 'late entry' ? p.entry : null });
  const m = merchById(state, p.merchId);
  raise(state, 'warn', `Geofence: ${problem} for ${m?.name ?? 'merchandiser'} at ${s.name}. ${minutes} paid min need review.`);
}

export function onTick(state: SimState): void {
  const g = geo(state);
  for (const s of state.stores) {
    const L = s.lock;
    if (!L || !s.assign || state.t < L.arrive) continue;
    const problem = plannedProblem(state, s);
    let p = g.presence[s.id];
    if (!p) {
      const entry = problem === 'missing entry' ? null
        : problem === 'late entry' ? L.arrive + 15 + Math.round(hash01(`${s.id}|geo-late`) * 25) : L.arrive;
      p = g.presence[s.id] = { storeId: s.id, merchId: s.assign, entry, exit: null, expectedEntry: L.arrive, expectedExit: L.end };
      if (problem === 'missing entry') flag(state, s, p, 'missing entry');
    }
    p.expectedExit = L.end;
    if (problem === 'late entry' && p.entry != null && state.t >= p.entry) flag(state, s, p, 'late entry');
    if (p.exit == null && state.t >= L.end) {
      if (problem === 'missing exit') { p.exit = -1; flag(state, s, p, 'missing exit') }
      else p.exit = L.end;
    }
  }
}

export function decide(state: SimState, id: number, status: 'accepted' | 'rejected'): void {
  const e = geo(state).exceptions.find(x => x.id === id);
  if (e) { e.status = status; e.decidedAt = state.t }
}

export const dropEvent: Curveball = {
  id: 'geofence',
  label: 'Phone misses a geofence event',
  targets: state => state.stores.filter(s => s.assign && !(s.lock && state.t >= s.lock.end) && !geo(state).exceptions.some(e => e.storeId === s.id))
    .map(s => ({ value: s.id, label: s.name })),
  apply(state, target) {
    const s = state.stores.find(x => x.id === target);
    if (!s) return;
    const arrived = !!s.lock && state.t >= s.lock.arrive;
    geo(state).forced[s.id] = arrived ? 'missing exit' : 'missing entry';
    raise(state, 'info', `Curveball: the phone will miss the ${arrived ? 'exit' : 'entry'} at ${s.name}.`);
  },
};

export const describe_ = (e: Exception) => `${e.problem} · expected ${fmt(e.expected)}${e.recorded != null ? ` · recorded ${fmt(e.recorded)}` : ''}`;

export const br011GeofenceExceptionsEngine: EngineFeature = {
  id: ID,
  title: 'Geofence exceptions',
  description: 'Automatic store entry/exit; missing or late geofence events go to a review queue to accept or reject.',
  requirements: ['BR-011'],
  defaultOn: true,
  ruleDefaults: { [PCT]: 10 },
  settings: [{ key: PCT, label: 'Visits with a geofence problem (%)', help: 'Missing entry, missing exit or late entry (repeatable)', type: 'number', step: 5, section: 'Geofence' }],
  curveballs: [dropEvent],
  onTick,
};
