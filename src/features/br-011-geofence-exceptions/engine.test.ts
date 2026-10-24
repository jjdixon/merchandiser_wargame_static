import { describe, expect, it } from 'vitest';
import { newDay, setRule, storeById, tick } from '../../engine';
import { seed } from '../../data';
import { br011GeofenceExceptionsEngine, decide, dropEvent, geo, plannedProblem } from './engine';

const day = (pct = 10) => { const s = newDay(seed, 'normal', { features: [br011GeofenceExceptionsEngine] }); setRule(s.rules, 'br011.failPct', pct); return s };
const runTo = (s: ReturnType<typeof day>, t: number) => { while (s.t < t) tick(s, 5) };

describe('br-011-geofence-exceptions [BR-011]', () => {
  it('records entry and exit automatically with no problems at 0%', () => {
    const s = day(0);
    runTo(s, 14 * 60);
    const p = geo(s).presence.s1;
    expect(p.entry).toBe(storeById(s, 's1')!.lock!.arrive);
    expect(p.exit).toBe(storeById(s, 's1')!.lock!.end);
    expect(geo(s).exceptions).toEqual([]);
  });

  it('a share of visits get a repeatable problem that lands in the review queue', () => {
    const s = day(30);
    const planned = s.stores.map(st => plannedProblem(s, st));
    expect(planned).toEqual(s.stores.map(st => plannedProblem(s, st)));
    runTo(s, 20 * 60);
    const ex = geo(s).exceptions;
    expect(ex.length).toBeGreaterThan(0);
    expect(ex.every(e => e.status === 'open' && e.minutes > 0)).toBe(true);
  });

  it('the curveball forces a missing entry (before arrival) or exit (after)', () => {
    const s = day(0);
    dropEvent.apply(s, 's4', {});
    runTo(s, 18 * 60);
    expect(geo(s).exceptions.map(e => [e.storeId, e.problem])).toEqual([['s4', 'missing entry']]);
  });

  it('a supervisor accepts or rejects an exception', () => {
    const s = day(0);
    dropEvent.apply(s, 's2', {});
    runTo(s, 12 * 60);
    const e = geo(s).exceptions[0];
    decide(s, e.id, 'rejected');
    expect(geo(s).exceptions[0]).toMatchObject({ status: 'rejected' });
    expect(dropEvent.targets(s).some(o => o.value === 's2')).toBe(false);
  });
});
