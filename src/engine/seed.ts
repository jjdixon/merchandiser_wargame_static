// Builds a fresh SimState from seed data + a scenario. Pure: no DOM, no globals.
import type { EngineFeature, MerchRole, RouteType, Rules, SimState, Severity, WeekState } from './types';
import { parseHHMM } from './time';
import { callOut, raise } from './sim';
import { emptyExtensions, enableFeatures } from './feature';

export interface StoreRow {
  id: string; name: string; x: number; y: number; cases: number;
  /** Trays delivered (NR-001). Default 0. */
  trays?: number;
  truckEta: string; doneBy: string; assignedTo: string | null; order: number;
  routeType?: RouteType; market?: string;
  /** Set by the week model for down-day visits. */
  pullUp?: boolean;
}
export interface MerchRow {
  id: string; name: string; x: number; y: number; hoursThisWeek: number;
  role?: MerchRole; market?: string; routeTypes?: RouteType[];
}
export interface RulesRow extends Omit<Rules, 'shiftStart' | 'feature' | 'mpt'> {
  shiftStart: string;
  /** Minutes per tray; defaults to minutes per case if missing. */
  mpt?: number;
}
export interface Scenario {
  id: string;
  label: string;
  notes?: string;
  /** Store id → minutes late. */
  truckDelays?: Record<string, number>;
  caseMultiplier?: number;
  /** Merchandiser ids who call out before the day starts. */
  callouts?: string[];
  openingAlert?: { sev: Severity; text: string };
}
export interface Seed {
  stores: StoreRow[]; merch: MerchRow[]; rules: RulesRow; scenarios: Scenario[];
  /** Weekly visit patterns (src/data/week.json). Without them every store is visited every day. */
  week?: import('./week').WeekPatterns;
}

export function rulesFrom(row: RulesRow): Rules {
  return { ...row, mpt: row.mpt ?? row.mpc, shiftStart: parseHHMM(row.shiftStart), feature: {} };
}

export interface DayOptions {
  /** Start from these rules instead of the seed's (e.g. keep the user's edits). */
  rules?: Rules;
  /** Enabled features, in registry order. Omit for the bare core. */
  features?: EngineFeature[];
  /** Day of week (default Thursday, 3) and the week it belongs to. */
  day?: number;
  week?: WeekState;
  /** Repeatable seed for this day's "random" events (default: the scenario id). */
  salt?: string;
}

/** A Thursday-only week: the seed's hours-this-week as the starting point. */
export const singleDayWeek = (seed: Seed): WeekState => ({
  day: 3, history: [], master: {}, fx: {},
  startHours: Object.fromEntries(seed.merch.map(m => [m.id, m.hoursThisWeek])),
});

export function newDay(seed: Seed, scenarioId: string, opts: DayOptions = {}): SimState {
  const r = opts.rules ? { ...opts.rules, feature: { ...opts.rules.feature } } : rulesFrom(seed.rules);
  const state: SimState = {
    t: r.shiftStart,
    scenario: opts.salt ?? scenarioId,
    day: opts.day ?? 3,
    week: opts.week ?? singleDayWeek(seed),
    rules: r,
    merch: seed.merch.map(m => ({
      id: m.id, name: m.name, role: m.role ?? 'merchandiser', market: m.market ?? '',
      routeTypes: m.routeTypes ?? ['LF'], home: [m.x, m.y], week: m.hoursThisWeek, out: false,
    })),
    stores: seed.stores.map(s => ({
      id: s.id, name: s.name, routeType: s.routeType ?? 'LF', pullUp: !!s.pullUp, market: s.market ?? '', xy: [s.x, s.y], cases: s.cases, trays: s.trays ?? 0,
      eta: parseHHMM(s.truckEta), win: parseHHMM(s.doneBy),
      assign: s.assignedTo, seq: s.order, extra: 0, lock: null, answers: {},
    })),
    alerts: [],
    fired: {},
    nextId: 0,
    ext: emptyExtensions(),
    enabled: [],
    fx: {},
  };
  // Features first, so scenario setup (e.g. call-outs) sees their hooks.
  enableFeatures(state, opts.features ?? []);
  const scn = seed.scenarios.find(x => x.id === scenarioId);
  if (!scn) { for (const h of state.ext.onDayStart) h(state); return state }
  for (const [id, d] of Object.entries(scn.truckDelays ?? {})) {
    const s = state.stores.find(x => x.id === id);
    if (s) s.eta += d;
  }
  if (scn.caseMultiplier) state.stores.forEach(s => { s.cases = Math.round(s.cases * scn.caseMultiplier!); s.trays = Math.round(s.trays * scn.caseMultiplier!) });
  if (scn.openingAlert) raise(state, scn.openingAlert.sev, scn.openingAlert.text);
  for (const id of scn.callouts ?? []) {
    const m = state.merch.find(x => x.id === id);
    if (m) callOut(state, m);
  }
  for (const h of state.ext.onDayStart) h(state);
  return state;
}
