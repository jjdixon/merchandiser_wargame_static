import { describe, expect, it } from 'vitest';
import {
  addWork, allPlans, autoAssign, callOut, delayTruck, fmt, merchById, newDay, parseHHMM,
  plan, status, storeById, tick, totals, workMin, type Seed,
} from '../src/engine';
import { seed as realSeed } from '../src/data';

// A tiny hand-checkable world: one merchandiser, two stores 10 km apart on a
// straight road (road factor 1, 60 km/h → 1 km per minute).
const tiny = (over: Partial<Seed['rules']> = {}): Seed => ({
  rules: { shiftStart: '05:00', buffer: 10, mpc: 1, fixed: 10, speed: 60, road: 1, paidBetween: true, paidCommute: false, ot: 40, wage: 20, mileage: 0.5, ...over },
  merch: [{ id: 'a', name: 'Alex', x: 0, y: 0, hoursThisWeek: 30 }],
  stores: [
    { id: 's1', name: 'Store One', x: 10, y: 0, cases: 50, truckEta: '06:00', doneBy: '12:00', assignedTo: 'a', order: 1 },
    { id: 's2', name: 'Store Two', x: 20, y: 0, cases: 20, truckEta: '07:00', doneBy: '12:00', assignedTo: 'a', order: 2 },
  ],
  scenarios: [{ id: 'base', label: 'Base' }],
});

describe('core: time helpers', () => {
  it('round-trips HH:MM', () => {
    expect(parseHHMM('05:30')).toBe(330);
    expect(fmt(330)).toBe('5:30a');
    expect(fmt(13 * 60 + 5)).toBe('1:05p');
    expect(() => parseHHMM('5.30')).toThrow();
  });
});

describe('core: planning', () => {
  it('applies the labor standard: fixed + cases × minutes per case', () => {
    const s = newDay(tiny(), 'base');
    expect(workMin(s, storeById(s, 's1')!)).toBe(60);
  });

  it('times the first departure so the merchandiser arrives when product is ready', () => {
    const s = newDay(tiny(), 'base');
    const [x1, x2] = plan(s, s.merch[0]).stops;
    expect(x1.arrive).toBe(370);           // truck 6:00 + 10 min buffer
    expect(x1.depart).toBe(360);           // 10 km at 1 km/min
    expect(x1.wait).toBe(0);
    expect(x1.end).toBe(430);              // 60 min work
    expect(x2.arrive).toBe(440);           // 10 min drive
    expect(x2.start).toBe(440);            // product ready at 7:10 already
    expect(x2.end).toBe(470);              // 10 + 20 × 1
  });

  it('pays drive time between stores but not the commute by default', () => {
    const s = newDay(tiny(), 'base');
    const p = plan(s, s.merch[0]);
    expect(p.paid).toBe(60 + 30 + 10);    // work + work + between-store drive
    expect(p.clockIn).toBe(370);
  });

  it('respects the paid-drive and paid-commute switches', () => {
    const unpaid = newDay(tiny({ paidBetween: false }), 'base');
    expect(plan(unpaid, unpaid.merch[0]).paid).toBe(90);
    const commute = newDay(tiny({ paidCommute: true }), 'base');
    expect(plan(commute, commute.merch[0]).paid).toBe(110);
  });

  it('splits regular and overtime hours against the weekly threshold', () => {
    const sd = tiny();
    sd.merch[0].hoursThisWeek = 39.5;
    const s = newDay(sd, 'base');
    const p = plan(s, s.merch[0]);         // 100 paid minutes today
    expect(p.reg).toBeCloseTo(0.5);
    expect(p.oth).toBeCloseTo(100 / 60 - 0.5);
    expect(p.labor).toBeCloseTo(0.5 * 20 + p.oth * 30);
  });

  it('flags stops that finish after the store done-by time', () => {
    const sd = tiny();
    sd.stores[1].doneBy = '07:30';
    const s = newDay(sd, 'base');
    expect(plan(s, s.merch[0]).late.map(x => x.s.id)).toEqual(['s2']);
  });
});

describe('core: simulation', () => {
  it('locks a stop once the merchandiser departs, so later edits only move the future', () => {
    const s = newDay(tiny(), 'base');
    tick(s, 361 - s.t);                    // 6:01, just after departing for s1
    expect(storeById(s, 's1')!.lock).not.toBeNull();
    expect(storeById(s, 's2')!.lock).toBeNull();
    s.rules.mpc = 2;                       // change the standard mid-day
    const [x1, x2] = plan(s, s.merch[0]).stops;
    expect(x1.work).toBe(60);              // frozen
    expect(x2.work).toBe(50);              // re-planned
  });

  it('turns a late truck into paid waiting time when the merchandiser is already en route', () => {
    const s = newDay(tiny(), 'base');
    tick(s, 361 - s.t);
    delayTruck(s, storeById(s, 's1')!, 30);
    const x1 = plan(s, s.merch[0]).stops[0];
    expect(x1.wait).toBe(30);
    expect(plan(s, s.merch[0]).paid).toBe(130);
  });

  it('ignores truck delays once work has started', () => {
    const s = newDay(tiny(), 'base');
    tick(s, 380 - s.t);
    const before = plan(s, s.merch[0]).stops[0].end;
    delayTruck(s, storeById(s, 's1')!, 60);
    expect(plan(s, s.merch[0]).stops[0].end).toBe(before);
  });

  it('extends an in-progress stop when the merchandiser runs long', () => {
    const s = newDay(tiny(), 'base');
    tick(s, 380 - s.t);
    addWork(s, storeById(s, 's1')!, 15);
    const [x1, x2] = plan(s, s.merch[0]).stops;
    expect(x1.end).toBe(445);
    expect(x2.arrive).toBe(455);
  });

  it('on call-out, finishes the current stop and releases the rest', () => {
    const s = newDay(tiny(), 'base');
    tick(s, 380 - s.t);
    const released = callOut(s, s.merch[0]);
    expect(released.map(x => x.id)).toEqual(['s2']);
    expect(storeById(s, 's1')!.assign).toBe('a');
    expect(status(s, plan(s, s.merch[0])).k).toBe('work');
  });
});

describe('core: shipped seed data', () => {
  it('loads every scenario without errors', () => {
    for (const scn of realSeed.scenarios) expect(() => newDay(realSeed, scn.id)).not.toThrow();
  });

  it('normal Thursday: Luis projects overtime (the built-in first argument)', () => {
    const s = newDay(realSeed, 'normal');
    const luis = plan(s, merchById(s, 'lui')!);
    expect(luis.weekProj).toBeGreaterThan(s.rules.ot);
  });

  it('call-out scenario leaves Luis\'s stops uncovered', () => {
    const s = newDay(realSeed, 'callout');
    expect(s.stores.filter(x => !x.assign).length).toBe(4);
  });

  it('auto-assign covers every open stop and keeps costs finite', () => {
    const s = newDay(realSeed, 'callout');
    autoAssign(s);
    expect(s.stores.every(x => x.assign)).toBe(true);
    expect(isFinite(totals(allPlans(s)).cost)).toBe(true);
  });

  it('runs a full day to completion with every stop done', () => {
    const s = newDay(realSeed, 'normal');
    while (s.t < 23 * 60) tick(s, 5);
    expect(s.stores.every(x => x.lock && x.lock.end <= s.t)).toBe(true);
  });
});
