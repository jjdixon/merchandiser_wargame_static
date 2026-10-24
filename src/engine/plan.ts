// Route planning, status and cost. Pure functions of SimState.
//
// Model: a merchandiser's day is an ordered list of stops. Stops already
// departed for are "locked" (their times are frozen in store.lock). Open stops
// are re-planned from the end of the last locked stop every time plan() runs,
// so edits and events only ever change the future, never history.
import type { DayPlan, Merchandiser, Minutes, Point, Rules, SimState, Status, Stop, Store } from './types';
import { fmt } from './time';

export const KM_TO_MI = 0.621371;

export const dist = (r: Rules, a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]) * r.road;
export const driveMin = (r: Rules, km: number) => (km / r.speed) * 60;
/**
 * Labor minutes for one visit: fixed + cases × minutes-per-case + extra, then
 * adjusted by any enabled feature's workMinutes hook (e.g. per-store standards).
 */
export function workMin(state: SimState, s: Store): Minutes {
  const r = state.rules;
  return state.ext.workMinutes.reduce((v, h) => h(state, s, v), r.fixed + s.cases * r.mpc + s.extra);
}
/**
 * When product is workable: truck arrival + receiving buffer, then adjusted by
 * any enabled feature's readyAt hook (e.g. store receiving hours).
 */
export function readyAt(state: SimState, s: Store): Minutes {
  return state.ext.readyAt.reduce((v, h) => h(state, s, v), s.eta + state.rules.buffer);
}

export function plan(state: SimState, m: Merchandiser): DayPlan {
  const r = state.rules;
  const mine = state.stores.filter(s => s.assign === m.id);
  const locked = mine.filter(s => s.lock).sort((a, b) => a.lock!.depart - b.lock!.depart);
  const open = mine.filter(s => !s.lock).sort((a, b) => a.seq - b.seq);

  const stops: Stop[] = [];
  let pos: Point = m.home;
  let t: number | null = null;
  for (const s of locked) {
    const L = s.lock!;
    stops.push({ s, depart: L.depart, arrive: L.arrive, start: L.start, end: L.end, drive: L.drive, km: L.km, wait: L.wait, work: L.work, first: L.first, locked: true });
    pos = s.xy;
    t = L.end;
  }
  if (!m.out) {
    for (const s of open) {
      const km = dist(r, pos, s.xy);
      const d = driveMin(r, km);
      const first = t === null;
      const ready = readyAt(state, s);
      // First stop: leave home so you arrive when product is ready (not before shiftStart).
      // Later stops: leave as soon as the previous one ends. Never in the past.
      const planned = first ? Math.max(r.shiftStart, ready - d) : (t as number);
      const depart = Math.max(planned, state.t);
      const arrive = depart + d;
      const start = Math.max(arrive, ready);
      const work = workMin(state, s);
      const end = start + work;
      stops.push({ s, depart, arrive, start, end, drive: d, km, wait: start - arrive, work, first, locked: false });
      pos = s.xy;
      t = end;
    }
  }
  return summarize(r, m, stops);
}

function summarize(r: Rules, m: Merchandiser, stops: Stop[]): DayPlan {
  let work = 0, wait = 0, dB = 0, dF = 0, kB = 0, kF = 0, cases = 0;
  for (const x of stops) {
    work += x.work; wait += x.wait; cases += x.s.cases;
    if (x.first) { dF += x.drive; kF += x.km } else { dB += x.drive; kB += x.km }
  }
  const paid = work + wait + (r.paidBetween ? dB : 0) + (r.paidCommute ? dF : 0);
  const weekProj = m.week + paid / 60;
  const reg = Math.max(0, Math.min(paid / 60, r.ot - m.week));
  const oth = paid / 60 - reg;
  const miles = (kB + (r.paidCommute ? kF : 0)) * KM_TO_MI;
  return {
    m, stops, work, wait, dB, dF, kB, kF, paid, cases, weekProj, reg, oth, miles,
    late: stops.filter(x => x.end > x.s.win),
    clockIn: stops.length ? (r.paidCommute ? stops[0].depart : stops[0].arrive) : null,
    clockOut: stops.length ? stops[stops.length - 1].end : null,
    labor: reg * r.wage + oth * r.wage * 1.5,
    mileage: miles * r.mileage,
  };
}

export const allPlans = (state: SimState) => state.merch.map(m => plan(state, m));

/** Paid minutes actually worked up to state.t (for the merchandiser's clock). */
export function paidSoFar(state: SimState, p: DayPlan): number {
  const r = state.rules, t = state.t;
  const seg = (a: number, b: number) => Math.max(0, Math.min(t, b) - a);
  return p.stops.reduce((acc, x) =>
    acc + seg(x.start, x.end) + seg(x.arrive, x.start) +
    ((x.first ? r.paidCommute : r.paidBetween) ? seg(x.depart, x.arrive) : 0), 0);
}

export function status(state: SimState, p: DayPlan): Status {
  const t = state.t;
  if (p.m.out && !p.stops.some(x => t < x.end)) return { k: 'out', label: 'Called out' };
  if (!p.stops.length) return { k: 'idle', label: 'No stops assigned', pos: p.m.home };
  if (t < p.stops[0].depart) return { k: 'off', label: 'Off clock · leaves ' + fmt(p.stops[0].depart), stop: p.stops[0], pos: p.m.home };
  let prev: Point = p.m.home;
  for (const x of p.stops) {
    if (t < x.depart) return { k: 'idle', label: 'Idle — next stop ' + fmt(x.depart), stop: x, pos: prev };
    if (t < x.arrive) {
      const f = (t - x.depart) / (x.drive || 1);
      return { k: 'drive', label: 'Driving → ' + x.s.name, stop: x, pct: f, pos: [prev[0] + (x.s.xy[0] - prev[0]) * f, prev[1] + (x.s.xy[1] - prev[1]) * f] };
    }
    if (t < x.start) return { k: 'wait', label: 'Waiting on truck', stop: x, pos: x.s.xy };
    if (t < x.end) return { k: 'work', label: 'Working', stop: x, pct: (t - x.start) / x.work, pos: x.s.xy };
    prev = x.s.xy;
  }
  return { k: 'done', label: 'Day done · out ' + fmt(p.clockOut), pos: prev };
}

export interface Totals { reg: number; oth: number; labor: number; miles: number; mileage: number; cases: number; wait: number; driveBetween: number; paid: number; cost: number; costPerCase: number }
export function totals(plans: DayPlan[]): Totals {
  const t = plans.reduce((a, p) => ({
    reg: a.reg + p.reg, oth: a.oth + p.oth, labor: a.labor + p.labor, miles: a.miles + p.miles,
    mileage: a.mileage + p.mileage, cases: a.cases + p.cases, wait: a.wait + p.wait,
    driveBetween: a.driveBetween + p.dB, paid: a.paid + p.paid,
  }), { reg: 0, oth: 0, labor: 0, miles: 0, mileage: 0, cases: 0, wait: 0, driveBetween: 0, paid: 0 });
  const cost = t.labor + t.mileage;
  return { ...t, cost, costPerCase: cost / Math.max(1, t.cases) };
}
