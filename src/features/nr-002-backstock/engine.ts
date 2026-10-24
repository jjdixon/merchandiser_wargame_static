// NR-002 Backstock counts.
// The merchandiser counts backstock (trays and cases) in the backroom when they
// arrive and again before they leave. How detailed the count is isn't decided yet,
// so it's a switch: totals (trays, cases) or by product category.
//
// Results go on the core store record (store.backstock) so other features — order
// feedback (NR-003) — can read them without importing this one. At the end of the
// day each store's counts are kept in week state for the trend.
import {
  DAYS, hash01, ruleBool, weekState,
  type CountField, type EngineFeature, type SimState, type StepAnswer, type Store, type Units, type VisitStep,
} from '../../engine';
import CATS from './categories.json';

export const ID = 'nr-002-backstock';
export const BY_CATEGORY = 'nr002.byCategory';
export const START = `${ID}:start`;
export const END = `${ID}:end`;

type Unit = keyof Units;
export interface Category { id: string; label: string; units: Unit[] }
export const CATEGORIES = CATS.categories as Category[];

export const byCategory = (state: SimState) => ruleBool(state.rules, BY_CATEGORY, false);

/** The number fields for a count, in the current granularity. */
export function countFields(state: SimState): CountField[] {
  if (!byCategory(state)) return [{ id: 'trays', label: 'trays' }, { id: 'cases', label: 'cases' }];
  return CATEGORIES.flatMap(c => c.units.map(u => ({ id: `${c.id}.${u}`, label: `${c.label} ${u}` })));
}

/** Roll any answer (totals or by category) up to trays + cases. */
export function totalsOf(counts: Record<string, number> | undefined): Units {
  const t: Units = { trays: 0, cases: 0 };
  for (const [k, v] of Object.entries(counts ?? {})) {
    const unit = (k.includes('.') ? k.split('.')[1] : k) as Unit;
    if (unit === 'trays' || unit === 'cases') t[unit] += v;
  }
  return t;
}

/** Spread a total over the fields that use that unit (repeatable). */
function spread(state: SimState, s: Store, total: Units, tag: string): Record<string, number> {
  const fields = countFields(state);
  if (!byCategory(state)) return { trays: total.trays, cases: total.cases };
  const out: Record<string, number> = {};
  for (const u of ['trays', 'cases'] as Unit[]) {
    const fs = fields.filter(f => f.id.endsWith('.' + u));
    const w = fs.map(f => 0.5 + hash01(`${state.scenario}|${s.id}|${tag}|${f.id}`));
    const sum = w.reduce((a, b) => a + b, 0);
    let left = total[u];
    fs.forEach((f, i) => { const n = i === fs.length - 1 ? left : Math.round((total[u] * w[i]) / sum); out[f.id] = Math.max(0, n); left -= n });
  }
  return out;
}

/** What a simulated merchandiser finds at arrival: some product left from last time. */
export function simulatedStart(state: SimState, s: Store): Units {
  const h = (k: string) => hash01(`${state.scenario}|${s.id}|bs-start|${k}`);
  // Pull-ups work from backstock, so there's more of it relative to today's work.
  const f = s.pullUp ? 1.6 : 0.25;
  return { trays: Math.round(s.trays * f * (0.3 + h('t'))), cases: Math.round(s.cases * f * (0.3 + h('c'))) };
}
/** What's left when they go: most of it worked to the shelf, some won't fit. */
export function simulatedEnd(state: SimState, s: Store): Units {
  const start = s.backstock?.start ?? simulatedStart(state, s);
  const h = (k: string) => hash01(`${state.scenario}|${s.id}|bs-end|${k}`);
  const left = (on: number, delivered: number, k: string) => Math.round(on * 0.25 * h(k) + delivered * 0.12 * h(k + '2'));
  return { trays: left(start.trays, s.trays, 't'), cases: left(start.cases, s.cases, 'c') };
}

export function steps(state: SimState, _s: Store): VisitStep[] {
  const fields = countFields(state), detailed = byCategory(state);
  const base = { featureId: ID, kind: 'counts' as const, required: true, countFields: fields };
  return [
    { ...base, id: START, phase: 'backstock', order: 5, title: 'Count backstock on arrival',
      detail: `Before you work anything: ${detailed ? 'each category' : 'trays and cases'} already in the backroom.`,
      autoAnswer: (st, x) => ({ counts: spread(st, x, simulatedStart(st, x), 'start') }) },
    { ...base, id: END, phase: 'closeout', order: 10, needsProduct: true, title: 'Count backstock before you leave',
      detail: `What's still in the backroom after the shelves are full${detailed ? ', by category' : ''}.`,
      autoAnswer: (st, x) => ({ counts: spread(st, x, simulatedEnd(st, x), 'end') }) },
  ];
}

export function onStepAnswered(_state: SimState, s: Store, step: VisitStep, a: StepAnswer): void {
  if (step.id !== START && step.id !== END) return;
  // Always a new object: the practice sandbox shares nothing with the real day this way.
  s.backstock = { ...s.backstock, [step.id === START ? 'start' : 'end']: totalsOf(a.counts) };
}

/** Week history: store id → day (0 = Mon) → counts. Written when the day ends. */
export interface Day { start?: Units; end?: Units; delivered: Units }
export const history = (state: SimState) => weekState<Record<string, Record<number, Day>>>(state, ID, () => ({}));

export function onDayEnd(state: SimState): void {
  const h = history(state);
  for (const s of state.stores) {
    if (!s.backstock) continue;
    (h[s.id] ??= {})[state.week.day] = { ...s.backstock, delivered: { trays: s.trays, cases: s.cases } };
  }
}

/** Earlier days this week that have a leaving count, oldest first. */
export function trend(state: SimState, storeId: string): Array<{ day: string; end: Units }> {
  const h = history(state)[storeId] ?? {};
  return Object.keys(h).map(Number).sort((a, b) => a - b)
    .filter(d => h[d].end).map(d => ({ day: DAYS[d], end: h[d].end! }));
}

export const nr002BackstockEngine: EngineFeature = {
  id: ID,
  title: 'Backstock counts',
  description: 'Count backstock (trays and cases) at arrival and before leaving each store — as totals or by category.',
  requirements: ['NR-002'],
  defaultOn: true,
  ruleDefaults: { [BY_CATEGORY]: false },
  settings: [
    { key: BY_CATEGORY, label: 'Count backstock by category', help: 'Off = just total trays and cases. On = each product category', type: 'boolean', section: 'Store visit' },
  ],
  visitSteps: steps,
  onStepAnswered,
  onDayEnd,
};
