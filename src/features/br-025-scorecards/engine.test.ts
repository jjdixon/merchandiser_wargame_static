import { describe, expect, it } from 'vitest';
import { buildDay, endDay, freshWeek, merchById, newDay, setRule, tick } from '../../engine';
import { seed } from '../../data';
import { GOALS, br025ScorecardsEngine, card, cards, history, kpis, meets, sum, weekCards } from './engine';

const features = [br025ScorecardsEngine];
const run = (s: ReturnType<typeof newDay>, until: number) => { while (s.t < until) tick(s, 5) };

describe('br-025-scorecards [BR-025]', () => {
  it('starts the day empty and fills in as stops finish', () => {
    const s = newDay(seed, 'normal', { features }), ana = merchById(s, 'ana')!;
    expect(card(s, ana)).toMatchObject({ done: 0, units: 0 });
    expect(kpis(card(s, ana)).adherence).toBeNull();
    run(s, 21 * 60);
    const c = card(s, ana), k = kpis(c);
    expect(c.done).toBe(c.stops);
    expect(k.completion).toBe(1);
    expect(k.uph).toBeGreaterThan(30);
    expect(c.paidH).toBeGreaterThan(4);
  });

  it('judges KPIs against goals that are settings', () => {
    const s = newDay(seed, 'normal', { features });
    expect(meets('uph', 65, s)).toBe(true);
    setRule(s.rules, GOALS.uph, 70);
    expect(meets('uph', 65, s)).toBe(false);
    expect(meets('steps', null, s)).toBeNull();
  });

  it('keeps each day and adds up the week per person', () => {
    const w = freshWeek(seed);
    for (let i = 0; i < 2; i++) { const s = buildDay(seed, w, 'normal', { features }); run(s, 21 * 60); endDay(s) }
    const s = buildDay(seed, w, 'normal', { features });
    expect(new Set(history(s).map(c => c.day))).toEqual(new Set([0, 1]));
    const ana = weekCards(s).find(c => c.merchId === 'ana')!;
    expect(ana.done).toBe(history(s).filter(c => c.merchId === 'ana').reduce((n, c) => n + c.done, 0));
    expect(sum(cards(s)).stops).toBe(cards(s).reduce((n, c) => n + c.stops, 0));
  });
});
