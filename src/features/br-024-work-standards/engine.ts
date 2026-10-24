// BR-024 Engineered work standards: labor time set per store, not one universal rate.
// Each store has a complexity class. "Standard" uses the global labor standard
// (Pay & labor rules); "Simple" and "Complex" scale the per-case and fixed minutes
// by editable percentages. A store's class can be changed on the Scheduler.
import { getRule, workMin, type EngineFeature, type Setting, type SimState, type Store } from '../../engine';
import DATA from './standards.json';

export const ID = 'br-024-work-standards';
export const CLASSES = DATA.classes as Array<{ id: string; label: string; note: string }>;
const STANDARD = CLASSES.findIndex(c => c.id === 'standard');

export const classKey = (storeId: string) => `br024.class.${storeId}`;
const pctKey = (cls: string, part: 'case' | 'fixed') => `br024.${cls}.${part}Pct`;

/** Class index for a store (extra visits and unknown stores are Standard). */
export function storeClass(state: SimState, s: Store): number {
  const v = getRule(state.rules, classKey(s.id));
  return typeof v === 'number' && CLASSES[v] ? v : STANDARD;
}

/** Percent multipliers for a class: [per-case, fixed]. Standard is always 100/100. */
export function factors(state: SimState, cls: number): [number, number] {
  const id = CLASSES[cls]?.id;
  if (!id || id === 'standard') return [1, 1];
  const c = getRule(state.rules, pctKey(id, 'case')), f = getRule(state.rules, pctKey(id, 'fixed'));
  return [(typeof c === 'number' ? c : 100) / 100, (typeof f === 'number' ? f : 100) / 100];
}

/** Engineered cases per hour at this store under the current standards. */
export const casesPerHour = (state: SimState, s: Store) => s.cases / Math.max(1 / 60, workMin(state, s) / 60);

const ruleDefaults: Record<string, number> = {};
for (const [cls, f] of Object.entries(DATA.factorDefaults)) {
  ruleDefaults[pctKey(cls, 'case')] = f.casePct;
  ruleDefaults[pctKey(cls, 'fixed')] = f.fixedPct;
}
for (const [storeId, cls] of Object.entries(DATA.stores as Record<string, string>))
  ruleDefaults[classKey(storeId)] = CLASSES.findIndex(c => c.id === cls);

const SECTION = 'Store work standards';
const settings: Setting[] = Object.keys(DATA.factorDefaults).flatMap(cls => {
  const label = CLASSES.find(c => c.id === cls)!.label;
  return [
    { key: pctKey(cls, 'case'), label: `${label}: per-case time (%)`, help: 'Percent of the global minutes per case', type: 'number', step: 5, section: SECTION },
    { key: pctKey(cls, 'fixed'), label: `${label}: fixed time (%)`, help: 'Percent of the global fixed minutes per visit', type: 'number', step: 5, section: SECTION },
  ] as Setting[];
});

export const br024WorkStandardsEngine: EngineFeature = {
  id: ID,
  title: 'Per-store work standards',
  description: 'Labor time varies by store complexity (simple / standard / complex) instead of one universal rate.',
  requirements: ['BR-024'],
  defaultOn: true,
  ruleDefaults,
  settings,
  workMinutes(state, s, base) {
    const [cf, ff] = factors(state, storeClass(state, s));
    const r = state.rules;
    return base + s.cases * r.mpc * (cf - 1) + r.fixed * (ff - 1);
  },
};
