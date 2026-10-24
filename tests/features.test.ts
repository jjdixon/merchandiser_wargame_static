// Core: the feature plug-in points. If these pass, a feature can only change
// what it plugs into — the contract every feature folder relies on.
import { describe, expect, it } from 'vitest';
import {
  enableFeatures, getRule, newDay, plan, readyAt, setRule, tick, workMin,
  type EngineFeature, type Seed,
} from '../src/engine';
import { FEATURES } from '../src/features';

const tiny = (): Seed => ({
  rules: { shiftStart: '05:00', buffer: 10, mpc: 1, fixed: 10, speed: 60, road: 1, paidBetween: true, paidCommute: false, ot: 40, wage: 20, mileage: 0.5 },
  merch: [{ id: 'a', name: 'Alex', x: 0, y: 0, hoursThisWeek: 30 }],
  stores: [
    { id: 's1', name: 'Store One', x: 10, y: 0, cases: 50, truckEta: '06:00', doneBy: '12:00', assignedTo: 'a', order: 1 },
    { id: 's2', name: 'Store Two', x: 20, y: 0, cases: 20, truckEta: '07:00', doneBy: '12:00', assignedTo: 'a', order: 2 },
  ],
  scenarios: [{ id: 'base', label: 'Base' }],
});

const receivingAt7: EngineFeature = {
  id: 'test-receiving', title: 't', description: 't', requirements: [], defaultOn: true,
  readyAt: (_st, s, base) => (s.id === 's1' ? Math.max(base, 420) : base),
};
const doubleLabor: EngineFeature = {
  id: 'test-labor', title: 't', description: 't', requirements: [], defaultOn: true,
  workMinutes: (st, _s, base) => base * (st.rules.feature['test.factor'] as number),
  ruleDefaults: { 'test.factor': 2 },
  settings: [{ key: 'test.factor', label: 'Factor', help: '', type: 'number', section: 'Test' }],
};

describe('core: feature plug-in points', () => {
  it('with no features, behaves exactly as the bare core', () => {
    const s = newDay(tiny(), 'base');
    expect(readyAt(s, s.stores[0])).toBe(370);
    expect(workMin(s, s.stores[0])).toBe(60);
  });

  it('readyAt hooks change when work can start, and the plan follows', () => {
    const s = newDay(tiny(), 'base', { features: [receivingAt7] });
    expect(plan(s, s.merch[0]).stops[0].start).toBe(420);
    expect(readyAt(s, s.stores[1])).toBe(430); // other store untouched
  });

  it('workMinutes hooks change labor, using a feature-owned setting', () => {
    const s = newDay(tiny(), 'base', { features: [doubleLabor] });
    expect(workMin(s, s.stores[0])).toBe(120);
    setRule(s.rules, 'test.factor', 3);
    expect(getRule(s.rules, 'test.factor')).toBe(3);
    expect(workMin(s, s.stores[0])).toBe(180);
    expect(s.ext.settings.map(x => x.key)).toEqual(['test.factor']);
  });

  it('hooks chain in registry order', () => {
    const s = newDay(tiny(), 'base', { features: [doubleLabor, { ...doubleLabor, id: 'again', ruleDefaults: {} }] });
    expect(workMin(s, s.stores[0])).toBe(240);
  });

  it('onTick runs every clock step', () => {
    let calls = 0;
    const s = newDay(tiny(), 'base', { features: [{ id: 'count', title: '', description: '', requirements: [], defaultOn: true, onTick: () => { calls++ } }] });
    tick(s, 5);
    expect(calls).toBe(5);
  });

  it('switching a feature off mid-day changes only the unlocked future', () => {
    const s = newDay(tiny(), 'base', { features: [doubleLabor] });
    tick(s, 361 - s.t);                    // departed for s1 → locked with doubled labor
    enableFeatures(s, []);
    const [x1, x2] = plan(s, s.merch[0]).stops;
    expect(x1.work).toBe(120);             // history kept
    expect(x2.work).toBe(30);              // future back to the core standard
  });

  it('every registered feature has a unique id, a title and a description', () => {
    const ids = FEATURES.map(f => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const f of FEATURES) { expect(f.title).toBeTruthy(); expect(f.description).toBeTruthy() }
  });

  it('every feature setting has a default value once enabled', () => {
    const s = newDay(tiny(), 'base', { features: FEATURES });
    for (const x of s.ext.settings) expect(getRule(s.rules, x.key)).not.toBeUndefined();
  });
});
