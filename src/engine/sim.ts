// Simulation clock, events and assignment actions. All functions mutate the
// SimState passed in and touch nothing else (no DOM, no storage).
import type { Merchandiser, Severity, SimState, Store } from './types';
import { allPlans, plan, readyAt } from './plan';
import { fmt, hrs } from './time';

export const END_OF_DAY = 23 * 60;

/** Push an alert. With a key, the alert is raised at most once per day. */
export function raise(state: SimState, sev: Severity, text: string, key?: string): void {
  if (key) {
    if (state.fired[key]) return;
    state.fired[key] = true;
  }
  state.alerts.unshift({ t: state.t, sev, text });
}

export const storeById = (state: SimState, id: string) => state.stores.find(s => s.id === id);
export const merchById = (state: SimState, id: string) => state.merch.find(m => m.id === id);
export const nextSeq = (state: SimState, mid: string) =>
  Math.max(0, ...state.stores.filter(s => s.assign === mid).map(s => s.seq)) + 1;

/**
 * Advance the clock by dt minutes.
 * Steps in ≤1-minute increments: each step plans at the current time, locks any
 * stop whose planned departure falls inside the step (keeping its planned
 * times), then advances the clock and raises alerts. Jumping the clock in one
 * go would re-time departures to "now" — see tests/engine.test.ts.
 */
export function tick(state: SimState, dt: number): void {
  let remaining = dt;
  while (remaining > 1e-9 && state.t < END_OF_DAY) {
    const step = Math.min(1, remaining);
    remaining -= step;
    const target = Math.min(state.t + step, END_OF_DAY);
    for (const m of state.merch) {
      for (const x of plan(state, m).stops) {
        if (!x.locked && x.depart <= target) {
          x.s.lock = { merch: m.id, depart: x.depart, arrive: x.arrive, start: x.start, end: x.end, drive: x.drive, km: x.km, wait: x.wait, work: x.work, first: x.first };
        }
      }
    }
    state.t = target;
    raiseAlerts(state);
  }
}

function raiseAlerts(state: SimState): void {
  const r = state.rules;

  for (const p of allPlans(state)) {
    const m = p.m;
    for (const x of p.stops) {
      if (x.wait > 3 && state.t >= x.arrive && state.t < x.start)
        raise(state, 'warn', `${m.name} is at ${x.s.name} waiting on the truck — ${Math.round(x.wait)} min of paid idle time.`, 'w' + x.s.id + Math.round(x.s.eta));
      if (x.end > x.s.win && state.t >= x.s.win && state.t < x.end)
        raise(state, 'bad', `${x.s.name} passed its done-by time (${fmt(x.s.win)}). ${m.name} projects finishing ${fmt(x.end)}.`, 'l' + x.s.id);
    }
    if (p.weekProj > r.ot)
      raise(state, 'warn', `${m.name} projects ${p.weekProj.toFixed(1)} hrs this week — overtime after ${r.ot}.`, 'o' + m.id + (m.out ? 'x' : ''));
    if (p.stops.length && p.clockOut! <= state.t && !m.out)
      raise(state, 'info', `${m.name} clocked out at ${fmt(p.clockOut)} · ${hrs(p.paid)} paid.`, 'd' + m.id);
  }

  for (const s of state.stores)
    if (!s.assign && readyAt(r, s) <= state.t)
      raise(state, 'bad', `${s.name}: product is on the dock and nobody is assigned.`, 'u' + s.id);
}

/* ---------- events (curveballs) ---------- */

/** Merchandiser calls out or goes home. Finishes a stop already in progress; releases the rest. */
export function callOut(state: SimState, m: Merchandiser): Store[] {
  m.out = true;
  const released = state.stores.filter(s => s.assign === m.id && !s.lock);
  released.forEach(s => (s.assign = null));
  const cur = state.stores.find(s => s.assign === m.id && s.lock && state.t < s.lock.end);
  raise(state, 'bad', `${m.name} called out${cur ? ` — finishing ${cur.name}, then going home` : ''}. ${released.length} stop${released.length === 1 ? '' : 's'} need coverage.`);
  return released;
}

/** Truck is late. Only valid before work starts at that stop. */
export function delayTruck(state: SimState, s: Store, minutes: number): void {
  if (s.lock && state.t >= s.lock.start) return;
  s.eta += minutes;
  if (s.lock) {
    const L = s.lock;
    L.start = Math.max(L.arrive, readyAt(state.rules, s));
    L.wait = L.start - L.arrive;
    L.end = L.start + L.work;
  }
}

/** Adds work minutes to a stop (e.g. running long). Extends a locked stop that isn't finished. */
export function addWork(state: SimState, s: Store, minutes: number): void {
  s.extra += minutes;
  if (s.lock && state.t < s.lock.end) { s.lock.work += minutes; s.lock.end += minutes }
}

/** Order arrives heavier than planned. Returns cases added. */
export function heavierLoad(state: SimState, s: Store, fraction = 0.4): number {
  const add = Math.round(s.cases * fraction);
  s.cases += add;
  if (s.lock && state.t < s.lock.end) { const m = add * state.rules.mpc; s.lock.work += m; s.lock.end += m }
  return add;
}

/** Store asks for an extra same-day visit. Creates an unassigned stop at the same location. */
export function extraVisit(state: SimState, base: Store, cases = 45, windowMin = 240): Store {
  const n: Store = {
    id: 'x' + ++state.nextId, name: base.name + ' · extra visit', xy: base.xy, cases,
    eta: state.t, win: state.t + windowMin, assign: null, seq: 99, extra: 0, lock: null, tasks: {},
  };
  state.stores.push(n);
  return n;
}

/* ---------- assignment ---------- */

export function assign(state: SimState, s: Store, mid: string | null): void {
  if (s.lock) return;
  s.assign = mid;
  if (mid) s.seq = nextSeq(state, mid);
}

/** Swap an open stop with its neighbour in route order. dir = -1 earlier, +1 later. */
export function move(state: SimState, s: Store, dir: -1 | 1): void {
  if (s.lock || !s.assign) return;
  const list = state.stores.filter(x => x.assign === s.assign && !x.lock).sort((a, b) => a.seq - b.seq);
  const j = list.indexOf(s) + dir;
  if (!list[j]) return;
  [s.seq, list[j].seq] = [list[j].seq, s.seq];
}

/** What a merchandiser's day would look like with this stop appended. Does not mutate. */
export function previewAssign(state: SimState, s: Store, m: Merchandiser) {
  const o = s.assign, q = s.seq;
  s.assign = m.id; s.seq = 99;
  const p = plan(state, m);
  s.assign = o; s.seq = q;
  return { plan: p, stop: p.stops.find(z => z.s.id === s.id) };
}

/**
 * Greedy auto-assign of every open (not yet departed) stop, in truck-arrival order.
 * Score = finish time + overtime penalty + late penalty + drive penalty.
 * Deliberately simple — it's a sparring partner for the scheduler, not an optimizer.
 * Replace with VROOM (see docs/decisions.md) when routing quality matters.
 */
export function autoAssign(state: SimState): void {
  const r = state.rules;
  const open = state.stores.filter(s => !s.lock).sort((a, b) => a.eta - b.eta);
  open.forEach(s => (s.assign = null));
  const avail = state.merch.filter(m => !m.out);
  for (const s of open) {
    let best: string | null = null, bestScore = Infinity;
    for (const m of avail) {
      s.assign = m.id; s.seq = nextSeq(state, m.id);
      const p = plan(state, m);
      const x = p.stops.find(z => z.s.id === s.id)!;
      const score = x.end + Math.max(0, p.weekProj - r.ot) * 90 + (x.end > s.win ? 240 : 0) + x.drive * 2;
      if (score < bestScore) { bestScore = score; best = m.id }
    }
    s.assign = best;
    if (best) s.seq = nextSeq(state, best);
  }
}
