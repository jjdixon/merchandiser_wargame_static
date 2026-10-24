import { describe, expect, it } from 'vitest';
import { assign, buildDay, endDay, freshWeek, setRule, storeById, tick } from '../../engine';
import { seed } from '../../data';
import { br010ScheduleGovernanceEngine, gov, isPublished, publish, usualStart } from './engine';

const opts = { features: [br010ScheduleGovernanceEngine] };

describe('br-010-schedule-governance [BR-010 BR-004]', () => {
  it('starts as a draft; changes before publishing are not logged', () => {
    const w = freshWeek(seed), s = buildDay(seed, w, 'normal', opts);
    setRule(s.rules, 'br010.autoPublish', false);
    expect(isPublished(s)).toBe(false);
    assign(s, storeById(s, 's2')!, 'mar');
    tick(s, 5);
    expect(gov(s).changes).toEqual([]);
  });

  it('auto-publishes at shift start by default', () => {
    const w = freshWeek(seed), s = buildDay(seed, w, 'normal', opts);
    tick(s, 2);
    expect(isPublished(s)).toBe(true);
  });

  it('after publishing, a reassignment is logged once and notifies', () => {
    const w = freshWeek(seed), s = buildDay(seed, w, 'normal', opts);
    publish(s, 'Scheduler');
    assign(s, storeById(s, 's4')!, 'ros');
    tick(s, 1); tick(s, 1);
    const ch = gov(s).changes.filter(c => c.kind === 'reassigned');
    expect(ch).toHaveLength(1);
    expect(ch[0]).toMatchObject({ storeId: 's4', from: 'Ana Ruiz', to: 'Rosa Vance' });
    expect(s.alerts.some(a => a.text.includes('Published schedule changed'))).toBe(true);
  });

  it('learns each store\'s usual start across days and flags big moves away from it', () => {
    const w = freshWeek(seed);
    const mon = buildDay(seed, w, 'normal', opts);
    while (mon.t < 23 * 60) tick(mon, 10);
    endDay(mon);
    const tue = buildDay(seed, w, 'normal', opts);
    expect(usualStart(tue, 's2')).not.toBeNull();
    publish(tue, 'Scheduler');
    storeById(tue, 's2')!.eta += 240;                  // pushes the start hours away
    tick(tue, 1);
    expect(gov(tue).changes.some(c => c.storeId === 's2' && c.kind === 'time moved' && c.usual)).toBe(true);
  });
});
