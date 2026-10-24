import { describe, expect, it } from 'vitest';
import { buildDay, freshWeek, rulesFrom, setRule } from '../../engine';
import { seed } from '../../data';
import { book, br005ReliefCoverageEngine, idleRelief, offToday, vacations } from './engine';

const opts = { features: [br005ReliefCoverageEngine] };
const on = (d: number, auto = true) => {
  const w = freshWeek(seed); w.day = d;
  const rules = rulesFrom(seed.rules); setRule(rules, 'br005.autoRelief', auto);
  return { w, s: buildDay(seed, w, 'normal', { ...opts, rules }) };
};

describe('br-005-relief-coverage [BR-005]', () => {
  it('a vacation day takes the person off and relief covers what it\'s qualified for', () => {
    const { s } = on(4);                                  // Dee off Friday
    expect(offToday(s)).toEqual(['dee']);
    expect(s.merch.find(m => m.id === 'dee')!.out).toBe(true);
    expect(s.stores.filter(x => x.assign === 'dee')).toHaveLength(0);
    expect(s.stores.some(x => x.assign === 'ros')).toBe(true);
  });

  it('with auto-relief off, the stops wait for the scheduler', () => {
    const { s } = on(4, false);
    expect(s.stores.filter(x => !x.assign).length).toBeGreaterThan(0);
    expect(s.alerts[0].text).toContain('need coverage');
  });

  it('bookings are per week, can\'t be in the past, and show up when that day is built', () => {
    const { w, s } = on(1);
    expect(book(s, 'ana', 0)).toBe(false);
    expect(book(s, 'ana', 3)).toBe(true);
    expect(vacations(s).some(v => v.merch === 'ana' && v.day === 3)).toBe(true);
    w.day = 3;
    expect(offToday(buildDay(seed, w, 'normal', opts))).toContain('ana');
  });

  it('relief with nothing to do is offered as available', () => {
    const { s } = on(1);                                  // Tuesday, nobody off
    expect(idleRelief(s).map(m => m.id)).toEqual(['ros']);
  });
});
