import { describe, expect, it } from 'vitest';
import { callOut, newDay, tick, type Seed } from '../../engine';
import { seed as realSeed } from '../../data';
import { dayAlertsEngine } from './engine';

const tiny = (): Seed => ({
  rules: { shiftStart: '05:00', buffer: 10, mpc: 1, fixed: 10, speed: 60, road: 1, paidBetween: true, paidCommute: false, ot: 40, wage: 20, mileage: 0.5 },
  merch: [{ id: 'a', name: 'Alex', x: 0, y: 0, hoursThisWeek: 30 }],
  stores: [{ id: 's1', name: 'Store One', x: 10, y: 0, cases: 50, truckEta: '06:00', doneBy: '06:30', assignedTo: 'a', order: 1 }],
  scenarios: [{ id: 'base', label: 'Base' }],
});

describe('day-alerts [BR-007 BR-014 BR-026]', () => {
  it('raises an uncovered-stop alert when product is ready and nobody is assigned', () => {
    const s = newDay(tiny(), 'base', { features: [dayAlertsEngine] });
    callOut(s, s.merch[0]);
    tick(s, 371 - s.t);
    expect(s.alerts.some(a => a.text.includes('nobody is assigned'))).toBe(true);
  });

  it('raises a missed done-by alert once, at the done-by time', () => {
    const s = newDay(tiny(), 'base', { features: [dayAlertsEngine] });
    tick(s, 400 - s.t);
    expect(s.alerts.filter(a => a.text.includes('passed its done-by')).length).toBe(1);
  });

  it('warns about projected overtime in the shipped data (Luis)', () => {
    const s = newDay(realSeed, 'normal', { features: [dayAlertsEngine] });
    tick(s, 1);
    expect(s.alerts.some(a => a.text.startsWith('Luis') && a.text.includes('overtime'))).toBe(true);
  });

  it('stays silent when switched off', () => {
    const s = newDay(tiny(), 'base');
    tick(s, 400 - s.t);
    expect(s.alerts).toEqual([]);
  });
});
