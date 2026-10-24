import { describe, expect, it } from 'vitest';
import { buildDay, callOut, endDay, freshWeek, merchById, newDay, raise, tick } from '../../engine';
import { seed } from '../../data';
import { br026ExceptionsEngine, fromAlert, grid, history, today, typeOf, unfinished, week } from './engine';

const features = [br026ExceptionsEngine];

describe('br-026-exceptions [BR-026]', () => {
  it('types alerts by their text and ties them to the person and store they name', () => {
    expect(typeOf('Geofence: missing exit for Ana Ruiz at ValuMart #1042.')!.id).toBe('geofence');
    expect(typeOf('Dispatch: truck to Fresh Fare #214 running 40 min late')!.id).toBe('delivery');
    expect(typeOf('Ana Ruiz projects 43.0 hrs this week — overtime after 40.')!.id).toBe('overtime');
    const s = newDay(seed, 'normal', { features });
    raise(s, 'warn', 'Ana Ruiz is at ValuMart #1042 waiting on the truck — 25 min of paid idle time.');
    expect(fromAlert(s, s.alerts[0])).toMatchObject({ type: 'delivery', merchId: 'ana', storeId: 's1', day: 3 });
  });

  it('plain news is not an exception', () => {
    const s = newDay(seed, 'normal', { features });
    raise(s, 'info', 'Ana Ruiz clocked out at 2:10p · 8.5 h paid.');
    expect(today(s).some(e => e.text.includes('clocked out'))).toBe(false);
  });

  it('adds unfinished stops at the end of the day and keeps the week', () => {
    const w = freshWeek(seed);
    const s = buildDay(seed, w, 'normal', { features });
    while (s.t < 9 * 60) tick(s, 5);
    callOut(s, merchById(s, 'mar')!);
    expect(unfinished(s).length).toBeGreaterThan(0);
    endDay(s);
    const s2 = buildDay(seed, w, 'normal', { features });
    expect(history(s2).some(e => e.type === 'incomplete' && e.day === 0)).toBe(true);
    expect(week(s2, { type: 'incomplete' }).every(e => e.type === 'incomplete')).toBe(true);
    const g = grid(week(s2));
    expect(g.find(r => r.type.id === 'incomplete')!.byDay[0]).toBeGreaterThan(0);
  });
});
