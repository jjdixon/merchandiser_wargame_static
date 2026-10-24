import { describe, expect, it } from 'vitest';
import { delayTruck, newDay, plan, setRule, storeById, tick } from '../../engine';
import { seed } from '../../data';
import { br009LateTruckOptionsEngine, choose, decisionFor, preview } from './engine';

const day = () => newDay(seed, 'normal', { features: [br009LateTruckOptionsEngine] });

describe('br-009-late-truck-options [BR-009]', () => {
  it('offers wait / swap / last when the next stop has a long truck wait', () => {
    const s = day(), ana = s.merch[0];
    tick(s, 6 * 60 - s.t);                              // Ana is at her first store
    delayTruck(s, storeById(s, 's2')!, 180);            // second stop's truck now 10:00
    const d = decisionFor(s, ana)!;
    expect(d.store.id).toBe('s2');
    expect(d.options.map(o => o.id)).toEqual(['wait', 'swap', 'last']);
    expect(d.waitMin).toBeGreaterThanOrEqual(20);
  });

  it('preview shows the effect without changing the plan', () => {
    const s = day(), ana = s.merch[0], s1 = storeById(s, 's1')!;
    delayTruck(s, s1, 90);
    const before = plan(s, ana).stops.map(x => x.s.id);
    preview(s, ana, s1, 'last');
    expect(plan(s, ana).stops.map(x => x.s.id)).toEqual(before);
  });

  it('choosing an option reorders the day and stops asking about that truck', () => {
    const s = day(), ana = s.merch[0], s1 = storeById(s, 's1')!;
    delayTruck(s, s1, 90);
    choose(s, ana, s1, 'swap', 'Ana');
    expect(plan(s, ana).stops.slice(0, 2).map(x => x.s.id)).toEqual(['s2', 's1']);
    expect(decisionFor(s, ana)?.store.id).not.toBe('s1');
  });

  it('a late first stop just means leaving home later — no choice needed', () => {
    const s = day();
    delayTruck(s, storeById(s, 's1')!, 90);
    expect(decisionFor(s, s.merch[0])).toBeNull();
  });

  it('no choice when the wait is short, or for someone who called out', () => {
    const s = day();
    expect(decisionFor(s, s.merch[3])).toBeNull();     // Luis: no long wait at the start
    tick(s, 6 * 60 - s.t);
    delayTruck(s, storeById(s, 's2')!, 180);
    s.merch[0].out = true;
    expect(decisionFor(s, s.merch[0])).toBeNull();
  });

  it('auto-pick chooses the fewest late stops, then the earliest finish', () => {
    const s = day(), ana = s.merch[0], s2 = storeById(s, 's2')!;
    tick(s, 6 * 60 - s.t);
    setRule(s.rules, 'br009lt.autoBest', true);
    delayTruck(s, s2, 180);
    const best = decisionFor(s, ana)!.best;
    tick(s, 1);
    expect(s.alerts.some(a => a.text.startsWith('Auto:'))).toBe(true);
    if (best !== 'wait') expect(plan(s, ana).stops[1].s.id).not.toBe('s2');
  });
});
