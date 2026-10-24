import { describe, expect, it } from 'vitest';
import { newDay, plan, readyAt, setRule, storeById, tick } from '../../engine';
import { seed } from '../../data';
import { br009StoreHoursEngine, conflicts, hoursKey, hoursOf } from './engine';

const day = (scn = 'normal') => newDay(seed, scn, { features: [br009StoreHoursEngine] });

describe('br-009-store-hours [BR-009]', () => {
  it('loads chain hours for every seeded store', () => {
    const s = day();
    for (const st of s.stores) expect(hoursOf(s, st)).not.toBeNull();
    expect(hoursOf(s, storeById(s, 's8')!)!.receivingOpen).toBe(7 * 60);
  });

  it('start waits for receiving to open (Hometown: truck 6:30, receiving 7:00)', () => {
    const s = day(), s8 = storeById(s, 's8')!;
    expect(readyAt(s, s8)).toBe(7 * 60);
    expect(plan(s, s.merch[2]).stops[0].start).toBe(7 * 60);
  });

  it('switching off "wait for receiving" falls back to truck + buffer', () => {
    const s = day();
    setRule(s.rules, 'br009.respectReceiving', false);
    expect(readyAt(s, storeById(s, 's8')!)).toBe(6 * 60 + 30 + s.rules.buffer);
  });

  it('editing a store\'s hours moves its start', () => {
    const s = day();
    setRule(s.rules, hoursKey('receivingOpen', 's2'), 9 * 60);
    expect(readyAt(s, storeById(s, 's2')!)).toBe(9 * 60);
  });

  it('flags and alerts a truck that lands after receiving closes', () => {
    const s = day();
    storeById(s, 's8')!.eta = 11 * 60;            // receiving closes 10:30
    expect(conflicts(s).some(c => c.storeId === 's8' && c.kind === 'receivingClosed')).toBe(true);
    tick(s, 11 * 60 - s.t);
    expect(s.alerts.some(a => a.text.includes('after receiving closes'))).toBe(true);
  });

  it('flags work running past merchandising hours', () => {
    const s = day();
    setRule(s.rules, hoursKey('merchClose', 's8'), 8 * 60);
    expect(conflicts(s).some(c => c.storeId === 's8' && c.kind === 'pastMerchHours')).toBe(true);
  });

  it('stores without hours (extra visits) are unaffected', () => {
    const s = day(), x = { ...storeById(s, 's1')!, id: 'x9', eta: 400 };
    expect(hoursOf(s, x)).toBeNull();
    expect(readyAt(s, x)).toBe(400 + s.rules.buffer);
  });
});
