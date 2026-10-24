import { describe, expect, it } from 'vitest';
import { answerStep, buildDay, endDay, freshWeek, newDay, setRule, storeById, visitSteps, type SimState, type Store } from '../../engine';
import { seed } from '../../data';
import { TOL, avgDailySales, daysToNextDelivery, nr003OrderFeedbackEngine, stepId, suggest, today, week, weekTally } from './engine';

const day = () => newDay(seed, 'normal', { features: [nr003OrderFeedbackEngine] });
const auto = (s: SimState, st: Store) => { for (const x of visitSteps(s, st)) answerStep(s, st, x.id, { ...x.autoAnswer!(s, st), auto: true }) };

describe('nr-003-order-feedback [NR-003]', () => {
  it('asks for trays and cases separately before leaving, with a suggestion and why', () => {
    const s = day(), steps = visitSteps(s, storeById(s, 's1')!);
    expect(steps.map(x => x.id)).toEqual([stepId('trays'), stepId('cases')]);
    expect(steps.every(x => x.phase === 'closeout' && x.required)).toBe(true);
    expect(steps[0].detail).toMatch(/^Suggested: (Light|About right|Heavy)\. \d+ on hand/);
  });

  it('next delivery follows the route type pattern (Thursday seed day)', () => {
    const s = day();
    expect(daysToNextDelivery(s, storeById(s, 's1')!)).toEqual({ days: 1, day: 'Fri' });   // LF
    expect(daysToNextDelivery(s, storeById(s, 's3')!)).toEqual({ days: 2, day: 'Sat' });   // Traditional
  });

  it('coverage = (delivered + arrival backstock) ÷ (daily sales × days to next truck)', () => {
    const s = day(), st = storeById(s, 's2')!, avg = avgDailySales(st).trays;
    st.trays = avg; st.backstock = { start: { trays: 0, cases: 0 } };
    expect(suggest(s, st, 'trays').call).toBe('About right');
    st.trays = Math.round(avg * 1.5);
    expect(suggest(s, st, 'trays').call).toBe('Heavy');
    st.trays = Math.round(avg * 0.5);
    expect(suggest(s, st, 'trays').call).toBe('Light');
    setRule(s.rules, TOL, 60);
    expect(suggest(s, st, 'trays').call).toBe('About right');           // wider tolerance
  });

  it('a big leftover backstock means heavy even when coverage looks fine', () => {
    const s = day(), st = storeById(s, 's2')!;
    st.trays = avgDailySales(st).trays; st.backstock = { start: { trays: 0, cases: 0 }, end: { trays: 40, cases: 0 } };
    expect(suggest(s, st, 'trays')).toMatchObject({ call: 'Heavy' });
    expect(suggest(s, st, 'trays').why).toContain("didn't fit");
  });

  it('anything not about right goes to the store\'s MSL, flagged when it differs from the suggestion', () => {
    const s = day(), st = storeById(s, 's2')!;
    st.trays = avgDailySales(st).trays; st.backstock = { start: { trays: 0, cases: 0 } };
    answerStep(s, st, stepId('trays'), { choice: 'Heavy' });
    expect(s.alerts[0].text).toContain(`Order feedback to MSL ${st.market}: Fresh Fare #214 trays heavy (app suggested about right)`);
    answerStep(s, st, stepId('cases'), { choice: 'About right' });
    expect(today(s)).toHaveLength(2);
    expect(s.alerts).toHaveLength(1);
  });

  it('pull-ups have no order to judge', () => {
    const s = day(), st = storeById(s, 's1')!;
    st.pullUp = true;
    expect(visitSteps(s, st)).toHaveLength(0);
  });

  it('builds a week tally from each day\'s feedback', () => {
    const w = freshWeek(seed);
    for (let i = 0; i < 2; i++) {
      const s = buildDay(seed, w, 'normal', { features: [nr003OrderFeedbackEngine] });
      for (const st of s.stores) auto(s, st);
      endDay(s);
    }
    const s = buildDay(seed, w, 'normal', { features: [nr003OrderFeedbackEngine] });
    expect(week(s).length).toBeGreaterThan(0);
    const t = weekTally(s, 's1');
    expect(t.trays.light + t.trays.heavy + t.cases.light + t.cases.heavy).toBeLessThanOrEqual(4);
  });
});
