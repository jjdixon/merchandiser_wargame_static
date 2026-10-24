import { describe, expect, it } from 'vitest';
import { newDay, setRule, tick } from '../../engine';
import { seed } from '../../data';
import { br007HoursGuaranteesEngine, explain, hoursNow, hoursState, limitsFor } from './engine';

const day = () => newDay(seed, 'normal', { features: [br007HoursGuaranteesEngine] });

describe('br-007-hours-guarantees [BR-007]', () => {
  it('limits come from the role (and can be set per person)', () => {
    const s = day();
    expect(limitsFor(s.merch.find(m => m.role === 'relief')!)).toEqual({ guarantee: 24, max: 40 });
    expect(limitsFor(s.merch[0])).toEqual({ guarantee: 32, max: 40 });
  });

  it('warns the scheduler when someone is scheduled past their max (Luis)', () => {
    const s = day();
    tick(s, 1);
    expect(s.alerts.some(a => a.text.startsWith('Luis') && a.text.includes('past the 40-hour maximum'))).toBe(true);
  });

  it('at the max, remaining stops are released and the reason can be recorded', () => {
    const s = day();
    while (s.t < 20 * 60 && !hoursState(s).unfinished.length) tick(s, 5);
    const u = hoursState(s).unfinished[0];
    expect(u.merchId).toBe('lui');
    expect(s.stores.filter(x => x.assign === null).length).toBeGreaterThan(0);
    explain(s, 0, 'Truck late');
    expect(hoursState(s).unfinished[0].reason).toBe('Truck late');
    expect(hoursNow(s, s.merch[3]).worked).toBeGreaterThanOrEqual(40);
  });

  it('with enforcement off, it only warns', () => {
    const s = day(); setRule(s.rules, 'br007.enforceMax', false);
    while (s.t < 20 * 60) tick(s, 5);
    expect(hoursState(s).unfinished).toEqual([]);
  });
});
