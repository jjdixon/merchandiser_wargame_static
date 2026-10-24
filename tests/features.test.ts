// Core: the feature plug-in points. If these pass, a feature can only change
// what it plugs into — the contract every feature folder relies on.
import { describe, expect, it } from 'vitest';
import {
  adjustDrive, adjustWork, answerStep, buildDay, endDay, freshWeek, projectDay, singleDayWeek, splitWork, THURSDAY, weekState, enableFeatures, featureState, getRule, hash01, isAnswered, pickShare, newDay, plan, readyAt, setRule, tick, visitProgress, visitSteps, workMin,
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

describe('core: M1 additions', () => {
  it('featureState gives each feature its own day-scoped slot', () => {
    const s = newDay(tiny(), 'base');
    const a = featureState(s, 'one', () => ({ n: 1 }));
    a.n = 5;
    expect(featureState(s, 'one', () => ({ n: 1 })).n).toBe(5);
    expect(featureState(s, 'two', () => ({ n: 1 })).n).toBe(1);
    expect(newDay(tiny(), 'base').fx).toEqual({});
  });

  it('adjustDrive shifts a locked stop before arrival, and the rest of the day follows', () => {
    const s = newDay(tiny(), 'base');
    tick(s, 361 - s.t);
    adjustDrive(s, s.stores[0], 15);
    const [x1, x2] = plan(s, s.merch[0]).stops;
    expect(x1.arrive).toBe(385);
    expect(x1.wait).toBe(0);
    expect(x1.end).toBe(445);
    expect(x2.arrive).toBe(455);
    tick(s, 390 - s.t);
    adjustDrive(s, s.stores[0], 15);            // after arrival: ignored
    expect(plan(s, s.merch[0]).stops[0].arrive).toBe(385);
  });

  it('adjustWork changes a locked stop without touching added scope', () => {
    const s = newDay(tiny(), 'base');
    tick(s, 380 - s.t);
    adjustWork(s, s.stores[0], -10);
    expect(plan(s, s.merch[0]).stops[0].end).toBe(420);
    expect(s.stores[0].extra).toBe(0);
    adjustWork(s, s.stores[0], -500);           // never below 1 minute
    expect(s.stores[0].lock!.work).toBe(1);
  });

  it('seed rows without role/market/route type get safe defaults', () => {
    const s = newDay(tiny(), 'base');
    expect(s.merch[0]).toMatchObject({ role: 'merchandiser', market: '', routeTypes: ['LF'] });
    expect(s.stores[0]).toMatchObject({ routeType: 'LF', market: '' });
  });
});

describe('core: every registered feature together', () => {
  it('runs every scenario to the end of the day with all features on', async () => {
    const { seed } = await import('../src/data');
    for (const scn of seed.scenarios) {
      const s = newDay(seed, scn.id, { features: FEATURES });
      while (s.t < 23 * 60) tick(s, 5);
      expect(s.stores.filter(x => x.assign).every(x => x.lock && x.lock.end <= s.t)).toBe(true);
    }
  });
});

describe('core: store visit steps (M2)', () => {
  const stepsFeature: EngineFeature = {
    id: 'test-visit', title: 't', description: 't', requirements: [], defaultOn: true,
    visitSteps: (_st, s) => [
      { id: 'test-visit:oos', featureId: 'test-visit', phase: 'oos', title: 'OOS', kind: 'entries', required: true },
      { id: 'test-visit:back', featureId: 'test-visit', phase: 'backstock', title: `Backstock at ${s.name}`, kind: 'count', required: true },
      { id: 'test-visit:opt', featureId: 'test-visit', phase: 'aisle', title: 'Optional', kind: 'check', required: false },
    ],
  };
  const photoPolicy: EngineFeature = {
    id: 'test-photo', title: 't', description: 't', requirements: [], defaultOn: true,
    adjustStep: (_st, _s, step) => (step.phase === 'oos' ? { ...step, photo: 'required' } : step),
  };

  it('collects steps from features in phase order', () => {
    const s = newDay(tiny(), 'base', { features: [stepsFeature] });
    expect(visitSteps(s, s.stores[0]).map(x => x.phase)).toEqual(['backstock', 'aisle', 'oos']);
  });

  it('tracks progress and the next step; optional steps never block close-out', () => {
    const s = newDay(tiny(), 'base', { features: [stepsFeature] }), st = s.stores[0];
    expect(visitProgress(s, st)).toMatchObject({ required: 2, doneRequired: 0, complete: false });
    expect(visitProgress(s, st).next!.id).toBe('test-visit:back');
    answerStep(s, st, 'test-visit:back', { count: 12 });
    answerStep(s, st, 'test-visit:oos', { done: true, entries: [] });
    expect(visitProgress(s, st).complete).toBe(true);
    expect(visitProgress(s, st).next!.id).toBe('test-visit:opt');
  });

  it('adjustStep hooks can change another feature\'s step (photo now required)', () => {
    const s = newDay(tiny(), 'base', { features: [stepsFeature, photoPolicy] }), st = s.stores[0];
    answerStep(s, st, 'test-visit:oos', { done: true });
    expect(isAnswered(visitSteps(s, st).find(x => x.phase === 'oos')!, st.answers['test-visit:oos'])).toBe(false);
    answerStep(s, st, 'test-visit:oos', { photo: { name: 'a.jpg', at: s.t } });
    expect(st.answers['test-visit:oos'].done).toBe(true);
    expect(isAnswered(visitSteps(s, st).find(x => x.phase === 'oos')!, st.answers['test-visit:oos'])).toBe(true);
  });

  it('onStepAnswered hooks hear every answer; unknown steps are ignored', () => {
    const heard: string[] = [];
    const listener: EngineFeature = { id: 'l', title: 't', description: 't', requirements: [], defaultOn: true, onStepAnswered: (_st, _s, step) => { heard.push(step.id) } };
    const s = newDay(tiny(), 'base', { features: [stepsFeature, listener] });
    answerStep(s, s.stores[0], 'test-visit:back', { count: 3 });
    answerStep(s, s.stores[0], 'nope', { done: true });
    expect(heard).toEqual(['test-visit:back']);
    expect(s.stores[0].answers.nope).toBeUndefined();
  });

  it('counts steps need every field; the closeout phase sorts last (M4.5)', () => {
    const f: EngineFeature = {
      id: 'tc', title: 't', description: 't', requirements: [], defaultOn: true,
      visitSteps: () => [
        { id: 'tc:leave', featureId: 'tc', phase: 'closeout', title: 'Leaving', kind: 'counts', required: true, countFields: [{ id: 'trays', label: 'trays' }, { id: 'cases', label: 'cases' }] },
        { id: 'tc:oos', featureId: 'tc', phase: 'oos', title: 'OOS', kind: 'check', required: true },
      ],
    };
    const s = newDay(tiny(), 'base', { features: [f] }), st = s.stores[0];
    expect(visitSteps(s, st).map(x => x.phase)).toEqual(['oos', 'closeout']);
    const step = visitSteps(s, st).find(x => x.id === 'tc:leave')!;
    answerStep(s, st, 'tc:leave', { counts: { trays: 4 } });
    expect(isAnswered(step, st.answers['tc:leave'])).toBe(false);
    answerStep(s, st, 'tc:leave', { counts: { trays: 4, cases: 0 } });
    expect(isAnswered(step, st.answers['tc:leave'])).toBe(true);
  });

  it('hash01 is repeatable and within 0..1', () => {
    expect(hash01('x')).toBe(hash01('x'));
    for (const k of ['a', 'b', 'c|d']) { expect(hash01(k)).toBeGreaterThanOrEqual(0); expect(hash01(k)).toBeLessThan(1) }
  });
});

describe('core: guided visit with every feature on', () => {
  it('every simulated visit ends complete, with displays, out-of-stocks and photos recorded', async () => {
    const { seed } = await import('../src/data');
    const s = newDay(seed, 'normal', { features: FEATURES });
    while (s.t < 23 * 60) tick(s, 5);
    // Every visit that happened ends complete (BR-007 may release stops at the weekly max).
    for (const st of s.stores.filter(x => x.lock)) expect(visitProgress(s, st).complete).toBe(true);
    expect(Object.keys(s.fx)).toEqual(expect.arrayContaining(['br-002-guided-visit', 'br-020-oos-root-cause', 'br-039-photo-capture']));
  });
});

describe('core: hash01 spread (M3)', () => {
  it('similar keys spread across 0..1 (no clumping)', () => {
    for (const k of ['geo', 'late', 'load', 'oos']) {
      const v = Array.from({ length: 40 }, (_, i) => hash01(`normal|s${i + 1}|${k}`));
      expect(v.filter(x => x < 0.25).length).toBeGreaterThan(4);
      expect(v.filter(x => x > 0.75).length).toBeGreaterThan(4);
    }
  });
});

describe('core: pickShare (M3)', () => {
  it('picks exactly the share, repeatably', () => {
    const ids = Array.from({ length: 14 }, (_, i) => `s${i + 1}`);
    expect(pickShare(ids, 'x', 20).size).toBe(3);
    expect([...pickShare(ids, 'x', 20)]).toEqual([...pickShare(ids, 'x', 20)]);
    expect(pickShare(ids, 'x', 0).size).toBe(0);
    expect(pickShare(ids, 'x', 100).size).toBe(14);
  });
});

describe('core: week model (M4)', () => {
  it('Thursday is the seed day: every store, seed hours, scenario id as the salt', async () => {
    const { seed } = await import('../src/data');
    const s = buildDay(seed, singleDayWeek(seed), 'normal');
    expect(s.day).toBe(THURSDAY);
    expect(s.stores.length).toBe(seed.stores.length);
    expect(s.scenario).toBe('normal');
    expect(s.merch[0].week).toBe(seed.merch[0].hoursThisWeek);
  });

  it('a down-day (Wed) is pull-ups only: LF stores, no truck, fewer cases', async () => {
    const { seed } = await import('../src/data');
    const w = freshWeek(seed); w.day = 2;
    const s = buildDay(seed, w, 'normal');
    expect(s.stores.length).toBeGreaterThan(0);
    expect(s.stores.every(x => x.pullUp && x.routeType === 'LF')).toBe(true);
    const s1 = s.stores.find(x => x.id === 's1')!;
    expect(s1.cases).toBeLessThan(seed.stores[0].cases);
    expect(s.scenario).toBe('normal@Wed');
  });

  it('ending a day carries paid hours into the next day', async () => {
    const { seed } = await import('../src/data');
    const w = freshWeek(seed);
    const mon = buildDay(seed, w, 'normal');
    while (mon.t < 23 * 60) tick(mon, 10);
    endDay(mon);
    expect(w.day).toBe(1);
    const tue = buildDay(seed, w, 'normal');
    const ana = tue.merch.find(m => m.id === 'ana')!;
    expect(ana.week).toBeCloseTo(w.history[0].merch.ana.paid / 60);
    expect(ana.week).toBeGreaterThan(0);
  });

  it('permanent (master) assignments apply to later days', async () => {
    const { seed } = await import('../src/data');
    const w = freshWeek(seed); w.master.s2 = 'ros';
    expect(buildDay(seed, w, 'normal').stores.find(x => x.id === 's2')!.assign).toBe('ros');
  });

  it('projecting a future day never changes the real week', async () => {
    const { seed } = await import('../src/data');
    const w = freshWeek(seed);
    const writer: EngineFeature = { id: 'w', title: '', description: '', requirements: [], defaultOn: true, onDayStart: st => { weekState(st, 'w', () => ({ n: 0 })).n++ } };
    projectDay(seed, w, 4, 'normal', { features: [writer] });
    expect(w.fx).toEqual({});
    expect(w.day).toBe(0);
  });

  it('onDayStart and onDayEnd hooks run; weekState survives from day to day', async () => {
    const { seed } = await import('../src/data');
    const w = freshWeek(seed), seen: number[] = [];
    const f: EngineFeature = { id: 'f', title: '', description: '', requirements: [], defaultOn: true,
      onDayStart: st => { seen.push(st.day) }, onDayEnd: st => { weekState(st, 'f', () => ({ ends: 0 })).ends++ } };
    const d0 = buildDay(seed, w, 'normal', { features: [f] }); endDay(d0);
    const d1 = buildDay(seed, w, 'normal', { features: [f] }); endDay(d1);
    expect(seen).toEqual([0, 1]);
    expect((w.fx.f as { ends: number }).ends).toBe(2);
  });

  it('splitWork moves a share of a store to a helper; the rest of the day follows', () => {
    const s = newDay(tiny(), 'base');
    const st = s.stores[0];
    const helper = splitWork(s, st, 'a', 0.5)!;
    expect(helper.cases + st.cases).toBe(50);
    expect(helper.assign).toBe('a');
    expect(helper.xy).toEqual(st.xy);
    expect(splitWork(s, st, 'a', 0)).toBeNull();
  });
});

describe('core: a full week with every feature on (M4)', () => {
  it('runs Monday to Sunday, rolling hours forward, with pull-ups on down-days', async () => {
    const { seed } = await import('../src/data');
    const w = freshWeek(seed);
    const days: number[] = [];
    for (let d = 0; d < 7; d++) {
      const s = buildDay(seed, w, 'normal', { features: FEATURES });
      expect(s.day).toBe(d);
      if (d === 2 || d === 6) expect(s.stores.filter(x => !x.id.includes('~')).every(x => x.pullUp)).toBe(true);
      while (s.t < 23 * 60) tick(s, 10);
      days.push(s.stores.length);
      endDay(s);
    }
    expect(w.history.map(h => h.day)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    const ana = w.history.reduce((h, d) => h + (d.merch.ana?.paid ?? 0), 0) / 60;
    expect(ana).toBeGreaterThan(20);
    expect(ana).toBeLessThanOrEqual(42);              // BR-007 stops at the max (finishes the stop in progress)
  });
});
