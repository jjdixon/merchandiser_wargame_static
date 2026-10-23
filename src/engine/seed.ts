// Builds a fresh SimState from seed data + a scenario. Pure: no DOM, no globals.
import type { Rules, SimState, Severity } from './types';
import { parseHHMM } from './time';
import { callOut, raise } from './sim';

export interface StoreRow {
  id: string; name: string; x: number; y: number; cases: number;
  truckEta: string; doneBy: string; assignedTo: string | null; order: number;
}
export interface MerchRow { id: string; name: string; x: number; y: number; hoursThisWeek: number }
export interface RulesRow extends Omit<Rules, 'shiftStart'> { shiftStart: string }
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
export interface Seed { stores: StoreRow[]; merch: MerchRow[]; rules: RulesRow; scenarios: Scenario[] }

export function rulesFrom(row: RulesRow): Rules {
  return { ...row, shiftStart: parseHHMM(row.shiftStart) };
}

export function newDay(seed: Seed, scenarioId: string, rules?: Rules): SimState {
  const r = rules ?? rulesFrom(seed.rules);
  const state: SimState = {
    t: r.shiftStart,
    scenario: scenarioId,
    rules: r,
    merch: seed.merch.map(m => ({ id: m.id, name: m.name, home: [m.x, m.y], week: m.hoursThisWeek, out: false })),
    stores: seed.stores.map(s => ({
      id: s.id, name: s.name, xy: [s.x, s.y], cases: s.cases,
      eta: parseHHMM(s.truckEta), win: parseHHMM(s.doneBy),
      assign: s.assignedTo, seq: s.order, extra: 0, lock: null, tasks: {},
    })),
    alerts: [],
    fired: {},
    nextId: 0,
  };
  const scn = seed.scenarios.find(x => x.id === scenarioId);
  if (!scn) return state;
  for (const [id, d] of Object.entries(scn.truckDelays ?? {})) {
    const s = state.stores.find(x => x.id === id);
    if (s) s.eta += d;
  }
  if (scn.caseMultiplier) state.stores.forEach(s => (s.cases = Math.round(s.cases * scn.caseMultiplier!)));
  if (scn.openingAlert) raise(state, scn.openingAlert.sev, scn.openingAlert.text);
  for (const id of scn.callouts ?? []) {
    const m = state.merch.find(x => x.id === id);
    if (m) callOut(state, m);
  }
  return state;
}
