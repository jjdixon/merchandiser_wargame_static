import { describe, expect, it } from 'vitest';
import { buildDay, freshWeek, newDay, plan, rulesFrom, setRule } from '../../engine';
import { seed } from '../../data';
import { br008MultiVisitHolidayEngine, secondVisitsToday } from './engine';

const opts = { features: [br008MultiVisitHolidayEngine] };
const dayN = (d: number, holiday = -1) => {
  const w = freshWeek(seed); w.day = d;
  const rules = rulesFrom(seed.rules); setRule(rules, 'br008.holiday', holiday);
  return buildDay(seed, w, 'normal', { ...opts, rules });
};

describe('br-008-multi-visit-holiday [BR-008]', () => {
  it('Thursday gets its planned second visit (unassigned → stays with the store owner)', () => {
    const s = newDay(seed, 'normal', opts);
    const v = secondVisitsToday(s);
    expect(v.map(x => x.id)).toEqual(['s5~2nd']);
    expect(v[0]).toMatchObject({ assign: 'mar', pullUp: true });
  });

  it('Friday second visits go to a different person, merchandising only', () => {
    const s = dayN(4);
    const v = secondVisitsToday(s);
    expect(v.map(x => [x.id, x.assign])).toEqual([['s1~2nd', 'ros'], ['s11~2nd', 'sam']]);
    expect(plan(s, s.merch.find(m => m.id === 'ros')!).stops.map(x => x.s.id)).toContain('s1~2nd');
  });

  it('holiday: no deliveries that day, build-up before, catch-up after', () => {
    const normal = dayN(1).stores.find(x => x.id === 's1')!.cases;
    expect(dayN(0, 1).stores.find(x => x.id === 's1')!.cases).toBe(Math.round(dayN(0).stores.find(x => x.id === 's1')!.cases * 1.3));
    const hol = dayN(1, 1);
    expect(hol.stores.every(x => x.pullUp)).toBe(true);
    expect(hol.stores.find(x => x.id === 's1')!.cases).toBeLessThan(normal);
    expect(dayN(2 + 1, 2).stores.find(x => x.id === 's1')!.cases).toBe(Math.round(seed.stores[0].cases * 1.5));
  });
});
