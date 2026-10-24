import { describe, expect, it } from 'vitest';
import { assign, buildDay, callOut, freshWeek, merchById, newDay, storeById, tick } from '../../engine';
import { seed } from '../../data';
import { br027WorkforceVisibilityEngine, dropped, rows, snapshot } from './engine';

const features = [br027WorkforceVisibilityEngine];
const row = (s: ReturnType<typeof newDay>, id: string) => rows(s).find(r => r.m.id === id)!;

describe('br-027-workforce-visibility [BR-027]', () => {
  it('snapshots the schedule at day start and shows everyone, relief and jumper included', () => {
    const s = newDay(seed, 'normal', { features });
    expect(snapshot(s).planned.filter(p => p.merchId === 'ana').length).toBe(row(s, 'ana').total);
    expect(rows(s).map(r => r.m.role)).toEqual(expect.arrayContaining(['merchandiser', 'relief', 'jumper']));
    expect(row(s, 'ana')).toMatchObject({ added: [], removed: [], done: 0 });
  });

  it('shows stops moved between people and work nobody has any more', () => {
    const s = newDay(seed, 'normal', { features });
    assign(s, storeById(s, 's4')!, 'ros');
    expect(row(s, 'ana').removed).toEqual(['s4']);
    expect(row(s, 'ros').added).toEqual(['s4']);
    while (s.t < 9 * 60) tick(s, 5);
    callOut(s, merchById(s, 'mar')!);
    expect(dropped(s).some(r => r.merchId === 'mar')).toBe(true);
  });

  it('tracks progress and time by activity as the day runs', () => {
    const s = newDay(seed, 'normal', { features });
    while (s.t < 11 * 60) tick(s, 5);
    const r = row(s, 'ana');
    expect(r.done).toBeGreaterThan(0);
    expect(r.workSoFar).toBeGreaterThan(0);
    expect(r.workSoFar).toBeLessThanOrEqual(r.workPlan + 1);
    expect(r.firstActual).not.toBeNull();
  });

  it('counts down-day pull-ups', () => {
    const w = freshWeek(seed); w.day = 2;                    // Wednesday
    const s = buildDay(seed, w, 'normal', { features });
    expect(rows(s).reduce((n, r) => n + r.pullUps, 0)).toBeGreaterThan(0);
  });
});
