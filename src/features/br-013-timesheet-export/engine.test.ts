import { describe, expect, it } from 'vitest';
import { buildDay, endDay, freshWeek, merchById, newDay, tick } from '../../engine';
import { seed } from '../../data';
import { adjust, br013TimesheetExportEngine, decide, exportCsv, hours, sheet, sheets, statusOf } from './engine';

const features = [br013TimesheetExportEngine];
const done = () => { const s = newDay(seed, 'normal', { features }); while (s.t < 21 * 60) tick(s, 5); return s };

describe('br-013-timesheet-export [BR-013]', () => {
  it('a sheet is open while working, then waits for approval', () => {
    const s = newDay(seed, 'normal', { features }), ana = merchById(s, 'ana')!;
    expect(statusOf(s, sheet(s, ana))).toBe('open');
    expect(decide(s, sheet(s, ana), 'approved', 'Mgr')).toBe(false);
    while (s.t < 21 * 60) tick(s, 5);
    expect(statusOf(s, sheet(s, ana))).toBe('pending');
  });

  it('splits regular and overtime on the week, and adjustments re-split it', () => {
    const s = done(), lui = sheet(s, merchById(s, 'lui')!);
    const h = hours(s, lui);
    expect(h.reg + h.oth).toBeCloseTo(lui.paidMin / 60);
    expect(h.reg).toBeCloseTo(Math.max(0, Math.min(lui.paidMin / 60, 40 - lui.weekBefore)));
    expect(adjust(s, lui, -30, '', 'Mgr')).toBe(false);                 // reason required
    expect(adjust(s, lui, -30, 'Rejected geofence gap', 'Mgr')).toBe(true);
    expect(hours(s, lui).paidMin).toBeCloseTo(lui.paidMin - 30);
  });

  it('returning needs a reason; only approved sheets are exported', () => {
    const s = done(), [a, b] = sheets(s);
    expect(decide(s, a, 'returned', 'Mgr', ' ')).toBe(false);
    expect(decide(s, a, 'returned', 'Mgr', 'Missing exit punch')).toBe(true);
    decide(s, b, 'approved', 'Mgr');
    const csv = exportCsv(s, sheets(s)).split('\n');
    expect(csv[0]).toMatch(/^employee_id,name,day,regular_hours,overtime_hours,mileage_miles/);
    expect(csv).toHaveLength(2);
    expect(csv[1]).toContain(b.empId);
  });

  it('finished days stay in the week for approval', () => {
    const w = freshWeek(seed);
    const s = buildDay(seed, w, 'normal', { features });
    while (s.t < 21 * 60) tick(s, 5);
    endDay(s);
    const s2 = buildDay(seed, w, 'normal', { features });
    const mon = sheets(s2).filter(x => x.day === 0);
    expect(mon.length).toBeGreaterThan(0);
    expect(mon.every(x => statusOf(s2, x) === 'pending')).toBe(true);
  });
});
