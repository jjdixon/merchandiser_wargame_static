import { describe, expect, it } from 'vitest';
import { newDay, setRule, storeById, tick, delayTruck } from '../../engine';
import { seed } from '../../data';
import { br014TruckVisibilityEngine, carrierDelay, scheduledEta, truckStatus, trucks } from './engine';

const day = (scn = 'normal') => newDay(seed, scn, { features: [br014TruckVisibilityEngine] });

describe('br-014-truck-visibility [BR-014]', () => {
  it('status moves scheduled → en route → delivered for an on-time truck', () => {
    const s = day(); setRule(s.rules, 'br014.lateTruckPct', 0);
    const st = storeById(s, 's4')!;                       // truck 9:00
    expect(truckStatus(s, st).status).toBe('scheduled');
    tick(s, 7 * 60 + 30 - s.t);
    expect(truckStatus(s, st).status).toBe('en route');
    tick(s, 9 * 60 - s.t);
    expect(truckStatus(s, st).status).toBe('delivered');
  });

  it('scenario delays count as late against the scheduled time', () => {
    const s = day('late'), st = storeById(s, 's1')!;
    expect(scheduledEta(s, st)).toBe(5 * 60 + 30);
    expect(truckStatus(s, st)).toMatchObject({ status: 'late', lateBy: 120 });
  });

  it('carrier delays are repeatable, a share of trucks, and revealed ahead of time', () => {
    const s = day(); setRule(s.rules, 'br014.lateTruckPct', 50);
    const delays = s.stores.map(st => carrierDelay(s, st));
    expect(delays).toEqual(s.stores.map(st => carrierDelay(s, st)));
    const late = s.stores.filter(st => carrierDelay(s, st) > 0);
    expect(late.length).toBeGreaterThan(0);
    expect(late.length).toBeLessThan(s.stores.length);
    while (s.t < 12 * 60) tick(s, 5);
    for (const st of late) expect(st.eta - scheduledEta(s, st)).toBe(carrierDelay(s, st));
  });

  it('0% means every carrier is on time', () => {
    const s = day(); setRule(s.rules, 'br014.lateTruckPct', 0);
    expect(s.stores.every(st => carrierDelay(s, st) === 0)).toBe(true);
  });

  it('notifies the merchandiser before they leave, with the new leave time', () => {
    const s = day(); setRule(s.rules, 'br014.lateTruckPct', 0);
    const st = storeById(s, 's4')!;                       // Ana's 4th stop, not left yet
    delayTruck(s, st, 60);
    tick(s, 1);
    const n = trucks(s).notices.find(x => x.storeId === 's4')!;
    expect(n.merchId).toBe('ana');
    expect(n.text).toContain('60 min late');
    expect(n.text).toMatch(/Leave at \d+:\d\d[ap] instead/);
  });
});
