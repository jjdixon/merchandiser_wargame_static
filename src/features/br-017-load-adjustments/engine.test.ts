import { describe, expect, it } from 'vitest';
import { newDay, plan, setRule, storeById, tick } from '../../engine';
import { seed } from '../../data';
import { adjustLoad, br017LoadAdjustmentsEngine, fillRate, loadCurveball, loads, ordered, warehouseChange } from './engine';

const day = () => newDay(seed, 'normal', { features: [br017LoadAdjustmentsEngine] });

describe('br-017-load-adjustments [BR-017]', () => {
  it('a cut lowers delivered cases, fill rate and planned labor, and notifies', () => {
    const s = day(), st = storeById(s, 's2')!;
    const work = plan(s, s.merch[0]).stops[1].work;
    adjustLoad(s, st, 0.75, 'warehouse');
    expect(ordered(s, st)).toEqual({ trays: 58, cases: 38 });
    expect(st.trays).toBe(44); expect(st.cases).toBe(29);
    expect(fillRate(s, st)).toBeCloseTo(73 / 96);
    expect(plan(s, s.merch[0]).stops[1].work).toBeLessThan(work);
    expect(s.alerts[0].text).toContain('Load cut for Fresh Fare #214: ordered 58 trays · 38 cases, now 44 · 29');
    expect(s.alerts[0].text).toContain('MSL North notified');
  });

  it('a change to a stop in progress adjusts its remaining labor', () => {
    const s = day(), st = storeById(s, 's1')!;
    while (!st.lock || s.t < st.lock.start + 5) tick(s, 1);
    const end = st.lock!.end;
    loadCurveball.apply(s, 's1', { pct: '30' });
    expect(st.lock!.end).toBeGreaterThan(end);
  });

  it('warehouse changes are repeatable, a share of stores, mostly cuts, applied ahead of the truck', () => {
    const s = day();
    const f = s.stores.map(st => warehouseChange(s, st));
    expect(f).toEqual(s.stores.map(st => warehouseChange(s, st)));
    setRule(s.rules, 'br017.adjustPct', 100);
    const all = s.stores.map(st => warehouseChange(s, st));
    expect(all.filter(x => x < 0).length).toBeGreaterThan(all.filter(x => x > 0).length);
    while (s.t < 12 * 60) tick(s, 5);
    expect(loads(s).changes.filter(c => c.source === 'warehouse').length).toBeGreaterThan(5);
  });

  it('0% means no warehouse changes', () => {
    const s = day(); setRule(s.rules, 'br017.adjustPct', 0);
    while (s.t < 14 * 60) tick(s, 5);
    expect(loads(s).changes).toEqual([]);
  });
});
