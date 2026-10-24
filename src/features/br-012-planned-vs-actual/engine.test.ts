import { describe, expect, it } from 'vitest';
import { newDay, plan, setRule, storeById, tick } from '../../engine';
import { seed } from '../../data';
import { br012PlannedVsActualEngine, comparison, driftFraction, pva, unit } from './engine';

const day = () => newDay(seed, 'normal', { features: [br012PlannedVsActualEngine] });
const runTo = (s: ReturnType<typeof day>, t: number) => tick(s, t - s.t);

describe('br-012-planned-vs-actual [BR-012]', () => {
  it('drift is repeatable and bounded', () => {
    expect(unit('a|b|work')).toBe(unit('a|b|work'));
    const s = day();
    for (const st of s.stores) for (const k of ['drive', 'work'] as const) {
      const f = driftFraction(s, st, k);
      expect(f).toBeGreaterThanOrEqual(-0.105);
      expect(f).toBeLessThanOrEqual(0.195);
    }
  });

  it('records the baseline plan and engineered times, then actuals diverge', () => {
    const s = day();
    runTo(s, 12 * 60);
    const st = pva(s);
    expect(Object.keys(st.baseline).length).toBe(s.stores.length);
    const done = comparison(s).flatMap(c => c.rows).filter(r => r.actual?.done);
    expect(done.length).toBeGreaterThan(3);
    expect(done.some(r => r.actual!.work !== r.engineered!.work)).toBe(true);
  });

  it('later stops re-plan from the actual end of the previous stop', () => {
    const s = day();
    runTo(s, 11 * 60);
    const stops = plan(s, s.merch[0]).stops;
    const i = stops.findIndex(x => !x.locked);
    if (i > 0) expect(stops[i].depart).toBeGreaterThanOrEqual(stops[i - 1].end);
  });

  it('variation 0 runs exactly to the standard', () => {
    const s = day();
    setRule(s.rules, 'br012.variation', 0);
    runTo(s, 14 * 60);
    for (const r of comparison(s).flatMap(c => c.rows).filter(x => x.actual))
      expect([r.actual!.drive, r.actual!.work]).toEqual([r.engineered!.drive, r.engineered!.work]);
  });

  it('work drift is applied once, when work starts', () => {
    const s = day();
    const s1 = storeById(s, 's1')!;
    while (!s1.lock) tick(s, 1);                 // Ana has just left for ValuMart #1042
    expect(s.t).toBeLessThan(s1.lock!.start);
    expect(pva(s).engineered.s1).toBeDefined();
    const before = s1.lock!.work;
    runTo(s, s1.lock!.start + 2);
    const after = s1.lock!.work;
    runTo(s, s1.lock!.start + 30);
    expect(s1.lock!.work).toBe(after);
    expect(after - before).toBe(Math.round(pva(s).engineered.s1.work * driftFraction(s, s1, 'work')));
  });
});
