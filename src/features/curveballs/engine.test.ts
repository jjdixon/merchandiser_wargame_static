import { describe, expect, it } from 'vitest';
import { newDay, plan, storeById, tick, type Seed } from '../../engine';
import { callOutCb, curveballsEngine, extraVisitCb, heavyLoad, truckLate } from './engine';

const tiny = (): Seed => ({
  rules: { shiftStart: '05:00', buffer: 10, mpc: 1, fixed: 10, speed: 60, road: 1, paidBetween: true, paidCommute: false, ot: 40, wage: 20, mileage: 0.5 },
  merch: [{ id: 'a', name: 'Alex', x: 0, y: 0, hoursThisWeek: 30 }],
  stores: [
    { id: 's1', name: 'Store One', x: 10, y: 0, cases: 50, truckEta: '06:00', doneBy: '12:00', assignedTo: 'a', order: 1 },
    { id: 's2', name: 'Store Two', x: 20, y: 0, cases: 20, truckEta: '07:00', doneBy: '12:00', assignedTo: 'a', order: 2 },
  ],
  scenarios: [{ id: 'base', label: 'Base' }],
});
const day = () => newDay(tiny(), 'base', { features: [curveballsEngine] });

describe('curveballs [BR-004 BR-008 BR-014 BR-017]', () => {
  it('registers all four curveballs with the core', () => {
    expect(day().ext.curveballs.map(c => c.id)).toEqual(['truck', 'heavy', 'callout', 'extra']);
  });

  it('truck late moves the ready time and raises an alert', () => {
    const s = day();
    truckLate.apply(s, 's1', { minutes: '30' });
    expect(plan(s, s.merch[0]).stops[0].start).toBe(400);
    expect(s.alerts[0].text).toContain('30 min late');
  });

  it('truck late is no longer offered once work has started', () => {
    const s = day();
    tick(s, 380 - s.t);
    expect(truckLate.targets(s).map(o => o.value)).toEqual(['s2']);
  });

  it('heavier load adds cases and extends an in-progress stop by the extra labor', () => {
    const s = day();
    tick(s, 380 - s.t);
    heavyLoad.apply(s, 's1', {});
    expect(storeById(s, 's1')!.cases).toBe(70);
    expect(plan(s, s.merch[0]).stops[0].end).toBe(450);
  });

  it('call-out releases stops and is no longer offered for that person', () => {
    const s = day();
    callOutCb.apply(s, 'a', {});
    expect(s.stores.every(x => !x.assign)).toBe(true);
    expect(callOutCb.targets(s)).toEqual([]);
  });

  it('extra visit creates an uncovered stop at the same store', () => {
    const s = day();
    extraVisitCb.apply(s, 's2', {});
    const x = s.stores.find(z => z.id.startsWith('x'))!;
    expect(x.xy).toEqual(storeById(s, 's2')!.xy);
    expect(x.assign).toBeNull();
    expect(extraVisitCb.targets(s).some(o => o.value === x.id)).toBe(false);
  });
});
