// BR-012 Planned vs. actual: real days don't run to the engineered standard.
// When a merchandiser leaves for a stop, the engineered drive and work times are
// recorded, then the actual drive (on departure) and actual work (when work starts)
// drift by a repeatable amount. The rest of their day re-plans from the actuals.
// Also records each stop's original planned start/end (the baseline) so schedule
// slip is visible.
import {
  adjustDrive, adjustWork, allPlans, featureState, ruleNum,
  type EngineFeature, type Minutes, type SimState, type Store,
} from '../../engine';

export const ID = 'br-012-planned-vs-actual';
const VARIATION = 'br012.variation';

export interface Engineered { drive: Minutes; work: Minutes; arrive: Minutes; start: Minutes; end: Minutes }
export interface PvaState {
  /** First plan seen for each stop (usually the start of the day). */
  baseline: Record<string, { start: Minutes; end: Minutes }>;
  /** Engineered times at departure, before drift. */
  engineered: Record<string, Engineered>;
  /** Work drift already applied. */
  workDone: Record<string, true>;
}
export const pva = (state: SimState) =>
  featureState<PvaState>(state, ID, () => ({ baseline: {}, engineered: {}, workDone: {} }));

/** Repeatable 0..1 from a string (same scenario + store = same drift every run). */
export function unit(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619) }
  return ((h >>> 0) % 100000) / 100000;
}

/**
 * Drift as a fraction of the engineered time, skewed toward running over:
 * with 15% variation the range is about −10% to +20%.
 */
export function driftFraction(state: SimState, s: Store, kind: 'drive' | 'work'): number {
  const v = ruleNum(state.rules, VARIATION, 15) / 100;
  return (unit(`${state.scenario}|${s.id}|${kind}`) - 0.35) * 2 * v;
}

export function onTick(state: SimState): void {
  const st = pva(state);
  for (const p of allPlans(state))
    for (const x of p.stops)
      if (!st.baseline[x.s.id]) st.baseline[x.s.id] = { start: x.start, end: x.end };

  for (const s of state.stores) {
    const L = s.lock;
    if (!L) continue;
    if (!st.engineered[s.id]) {
      st.engineered[s.id] = { drive: L.drive, work: L.work, arrive: L.arrive, start: L.start, end: L.end };
      if (L.drive > 0) adjustDrive(state, s, Math.round(L.drive * driftFraction(state, s, 'drive')));
    }
    if (!st.workDone[s.id] && state.t >= L.start) {
      st.workDone[s.id] = true;
      adjustWork(state, s, Math.round(st.engineered[s.id].work * driftFraction(state, s, 'work')));
    }
  }
}

export interface Row {
  store: Store;
  baseline?: { start: Minutes; end: Minutes };
  engineered?: Engineered;
  /** Actual so far: present once the merchandiser has left for the stop. */
  actual?: { drive: Minutes; work: Minutes; start: Minutes; end: Minutes; done: boolean };
}

/** Per-merchandiser comparison rows for the current day. */
export function comparison(state: SimState): Array<{ merchId: string; rows: Row[]; engineeredMin: Minutes; actualMin: Minutes }> {
  const st = pva(state);
  return allPlans(state).map(p => {
    let engineeredMin = 0, actualMin = 0;
    const rows = p.stops.map(x => {
      const e = st.engineered[x.s.id], L = x.s.lock;
      const row: Row = { store: x.s, baseline: st.baseline[x.s.id], engineered: e };
      if (e && L) {
        row.actual = { drive: L.drive, work: L.work, start: L.start, end: L.end, done: state.t >= L.end };
        engineeredMin += e.drive + e.work;
        actualMin += L.drive + L.work;
      }
      return row;
    });
    return { merchId: p.m.id, rows, engineeredMin, actualMin };
  });
}

export const br012PlannedVsActualEngine: EngineFeature = {
  id: ID,
  title: 'Planned vs actual',
  description: 'Actual drive and work times drift from the engineered standard; compare them stop by stop.',
  requirements: ['BR-012'],
  defaultOn: true,
  ruleDefaults: { [VARIATION]: 15 },
  settings: [{ key: VARIATION, label: 'Real-world variation (%)', help: '0 = everything runs exactly to the standard', type: 'number', step: 5, section: 'Planned vs actual' }],
  onTick,
};
