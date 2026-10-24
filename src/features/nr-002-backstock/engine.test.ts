import { describe, expect, it } from 'vitest';
import { answerStep, buildDay, endDay, freshWeek, isAnswered, newDay, setRule, storeById, visitSteps } from '../../engine';
import { seed } from '../../data';
import { BY_CATEGORY, END, START, history, nr002BackstockEngine, simulatedStart, totalsOf, trend } from './engine';

import type { SimState, Store } from '../../engine';

const features = [nr002BackstockEngine];
/** Answer this feature's steps the way a simulated merchandiser would. */
const autoComplete = (s: SimState, st: Store) => { for (const x of visitSteps(s, st)) answerStep(s, st, x.id, { ...x.autoAnswer!(s, st), auto: true }) };
const day = () => newDay(seed, 'normal', { features });

describe('nr-002-backstock [NR-002]', () => {
  it('counts backstock first thing and again last thing', () => {
    const s = day(), steps = visitSteps(s, storeById(s, 's1')!);
    expect(steps[0].id).toBe(START);
    expect(steps.at(-1)!.id).toBe(END);
    expect(steps[0].countFields!.map(f => f.id)).toEqual(['trays', 'cases']);
  });

  it('writes the counts to the store as trays and cases', () => {
    const s = day(), st = storeById(s, 's1')!;
    answerStep(s, st, START, { counts: { trays: 12, cases: 5 } });
    answerStep(s, st, END, { counts: { trays: 2, cases: 1 } });
    expect(st.backstock).toEqual({ start: { trays: 12, cases: 5 }, end: { trays: 2, cases: 1 } });
  });

  it('by category: one field per category and unit, rolled up to totals', () => {
    const s = day();
    setRule(s.rules, BY_CATEGORY, true);
    const st = storeById(s, 's2')!, step = visitSteps(s, st).find(x => x.id === START)!;
    expect(step.countFields!.length).toBe(5);
    expect(totalsOf({ 'bread.trays': 3, 'buns.trays': 4, 'snack.cases': 2, 'special.trays': 1, 'special.cases': 1 })).toEqual({ trays: 8, cases: 3 });
    answerStep(s, st, START, { counts: { 'bread.trays': 3 } });
    expect(isAnswered(step, st.answers[START])).toBe(false);          // every category needed
  });

  it('simulated counts are repeatable and add up in either granularity', () => {
    const a = day(), b = day(), sa = storeById(a, 's3')!;
    setRule(b.rules, BY_CATEGORY, true);
    autoComplete(a, sa); autoComplete(b, storeById(b, 's3')!);
    expect(sa.backstock!.start).toEqual(simulatedStart(a, sa));
    expect(storeById(b, 's3')!.backstock!.start).toEqual(sa.backstock!.start);
  });

  it('keeps each day\'s counts for the week trend', () => {
    const w = freshWeek(seed);
    let s = buildDay(seed, w, 'normal', { features });
    for (let i = 0; i < 2; i++) {
      for (const st of s.stores) autoComplete(s, st);
      endDay(s);
      s = buildDay(seed, w, 'normal', { features });
    }
    const id = Object.keys(history(s))[0];
    expect(Object.keys(history(s)[id]).length).toBe(2);
    expect(trend(s, id).map(x => x.day)).toEqual(['Mon', 'Tue']);
  });
});
