// BR-013 Payroll and expense integration (simulated).
// One timesheet per person per day: clock in/out, paid hours split regular/overtime
// (weekly), reimbursed miles, and the day's exceptions worth checking (geofence,
// overtime, hour limits). A manager approves it, returns it with a reason, or adjusts
// the minutes with a reason. Approved sheets make the payroll and mileage export
// preview. Pay rules are placeholders pending legal review (docs/pay-rules.md).
import {
  DAYS, plan, weekState,
  type EngineFeature, type Merchandiser, type SimState,
} from '../../engine';
import EMP from './employees.json';

export const ID = 'br-013-timesheet-export';
export const empId = (merchId: string) => (EMP.ids as Record<string, string>)[merchId] ?? `E-${merchId}`;

export type SheetStatus = 'open' | 'pending' | 'approved' | 'returned';
export interface Sheet {
  merchId: string; name: string; empId: string; day: number;
  clockIn: number | null; clockOut: number | null;
  paidMin: number; weekBefore: number; ot: number;
  miles: number; mileageRate: number; stops: number;
  flags: string[];
}
export interface Decision { status: 'approved' | 'returned'; by: string; day: number; t: number; reason?: string }
export interface Adjustment { minutes: number; reason: string; by: string }
interface Store_ { sheets: Sheet[]; decisions: Record<string, Decision>; adjust: Record<string, Adjustment> }
export const book = (state: SimState) => weekState<Store_>(state, ID, () => ({ sheets: [], decisions: {}, adjust: {} }));
export const key = (merchId: string, day: number) => `${merchId}@${day}`;

const FLAG = /geofence|overtime|hour maximum|max hours|maximum/i;

export function sheet(state: SimState, m: Merchandiser): Sheet {
  const p = plan(state, m), first = m.name.split(' ')[0];
  return {
    merchId: m.id, name: m.name, empId: empId(m.id), day: state.day,
    clockIn: p.clockIn, clockOut: p.clockOut, paidMin: p.paid, weekBefore: p.weekProj - p.paid / 60, ot: state.rules.ot,
    miles: p.miles, mileageRate: state.rules.mileage, stops: p.stops.length,
    flags: state.alerts.filter(a => FLAG.test(a.text) && (a.text.includes(m.name) || a.text.includes(first + ' '))).map(a => a.text).reverse(),
  };
}

/** Paid minutes after any adjustment, and the regular / overtime hour split. */
export function hours(state: SimState, s: Sheet): { paidMin: number; reg: number; oth: number; adjust: Adjustment | null } {
  const adjust = book(state).adjust[key(s.merchId, s.day)] ?? null;
  const paidMin = Math.max(0, s.paidMin + (adjust?.minutes ?? 0)), paidH = paidMin / 60;
  const reg = Math.max(0, Math.min(paidH, s.ot - s.weekBefore));
  return { paidMin, reg, oth: paidH - reg, adjust };
}

export function statusOf(state: SimState, s: Sheet): SheetStatus {
  const d = book(state).decisions[key(s.merchId, s.day)];
  if (d) return d.status;
  const finished = s.day < state.day || (s.clockOut != null && state.t >= s.clockOut) || s.stops === 0;
  return finished ? 'pending' : 'open';
}

/** Today's live sheets plus finished days. */
export function sheets(state: SimState, who: (m: Merchandiser) => boolean = () => true): Sheet[] {
  const ids = new Set(state.merch.filter(who).map(m => m.id));
  const today = state.merch.filter(who).map(m => sheet(state, m)).filter(s => s.stops > 0 || s.paidMin > 0);
  return [...book(state).sheets.filter(s => ids.has(s.merchId)), ...today];
}

export function decide(state: SimState, s: Sheet, status: Decision['status'], by: string, reason?: string): boolean {
  if (statusOf(state, s) === 'open') return false;                 // still working
  if (status === 'returned' && !reason?.trim()) return false;
  book(state).decisions[key(s.merchId, s.day)] = { status, by, day: state.day, t: state.t, reason: reason?.trim() };
  return true;
}

/** Change paid minutes (e.g. a rejected geofence gap). Sends the sheet back to pending. */
export function adjust(state: SimState, s: Sheet, minutes: number, reason: string, by: string): boolean {
  if (!reason.trim() || !Number.isFinite(minutes)) return false;
  const b = book(state), k = key(s.merchId, s.day);
  if (minutes === 0) delete b.adjust[k]; else b.adjust[k] = { minutes: Math.round(minutes), reason: reason.trim(), by };
  delete b.decisions[k];
  return true;
}

export function onDayEnd(state: SimState): void {
  book(state).sheets.push(...state.merch.map(m => sheet(state, m)).filter(s => s.stops > 0 || s.paidMin > 0));
}

const csv = (v: string | number) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));

/** Payroll + mileage lines for approved sheets (a preview — nothing is sent). */
export function exportCsv(state: SimState, list: Sheet[]): string {
  const head = ['employee_id', 'name', 'day', 'regular_hours', 'overtime_hours', 'mileage_miles', 'mileage_amount', 'adjust_minutes', 'adjust_reason', 'approved_by', 'exceptions'];
  const lines = list.filter(s => statusOf(state, s) === 'approved').map(s => {
    const h = hours(state, s), d = book(state).decisions[key(s.merchId, s.day)];
    return [s.empId, s.name, DAYS[s.day], h.reg.toFixed(2), h.oth.toFixed(2), s.miles.toFixed(1), (s.miles * s.mileageRate).toFixed(2), h.adjust?.minutes ?? 0, h.adjust?.reason ?? '', d?.by ?? '', s.flags.length ? 'reviewed' : 'none'].map(csv).join(',');
  });
  return [head.join(','), ...lines].join('\n');
}

export const br013TimesheetExportEngine: EngineFeature = {
  id: ID,
  title: 'Timesheets and payroll export',
  description: 'Daily timesheets (regular / overtime, miles, exceptions to check) that a manager approves, returns or adjusts, and a payroll and mileage export preview.',
  requirements: ['BR-013'],
  defaultOn: true,
  onDayEnd,
};
