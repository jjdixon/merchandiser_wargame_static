import { describe, expect, it } from 'vitest';
import { buildDay, endDay, freshWeek, storeById, tick } from '../../engine';
import { seed } from '../../data';
import { br004ReassignmentEngine, history, moveRoute, reassign, split } from './engine';

const opts = { features: [br004ReassignmentEngine] };

describe('br-004-reassignment [BR-004]', () => {
  it('today-only doesn\'t change who owns the store tomorrow', () => {
    const w = freshWeek(seed), mon = buildDay(seed, w, 'normal', opts);
    expect(reassign(mon, 's2', 'ros', 'today')).toBe(true);
    expect(storeById(mon, 's2')!.assign).toBe('ros');
    while (mon.t < 23 * 60) tick(mon, 10);
    endDay(mon);
    expect(storeById(buildDay(seed, w, 'normal', opts), 's2')!.assign).toBe('ana');
  });

  it('permanent changes the owner from tomorrow, not today', () => {
    const w = freshWeek(seed), mon = buildDay(seed, w, 'normal', opts);
    reassign(mon, 's2', 'ros', 'permanent');
    expect(storeById(mon, 's2')!.assign).toBe('ana');
    endDay(mon);
    expect(storeById(buildDay(seed, w, 'normal', opts), 's2')!.assign).toBe('ros');
  });

  it('a stop already started can\'t be moved for today', () => {
    const w = freshWeek(seed), s = buildDay(seed, w, 'normal', opts);
    while (!storeById(s, 's1')!.lock) tick(s, 1);
    expect(reassign(s, 's1', 'ros', 'today')).toBe(false);
  });

  it('moves a whole route and splits a store; everything lands in the history', () => {
    const w = freshWeek(seed), s = buildDay(seed, w, 'normal', opts);
    expect(moveRoute(s, 'dee', 'sam')).toBeGreaterThan(0);
    expect(s.stores.filter(x => x.assign === 'dee')).toHaveLength(0);
    expect(split(s, 's5', 'ros', 0.5)).toBe(true);
    expect(s.stores.some(x => x.id.startsWith('s5~split') && x.assign === 'ros')).toBe(true);
    expect(history(s)).toHaveLength(2);
  });
});
