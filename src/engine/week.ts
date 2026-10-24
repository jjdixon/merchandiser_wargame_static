// Week model (core). A week is a series of days; each day is a fresh SimState built
// from the seed (which describes Thursday), the weekly visit patterns and the week
// so far (hours worked, permanent assignments, week-scoped feature state).
//
//   buildDay(seed, week, scenario, opts)  → the SimState for week.day
//   endDay(state)                          → roll today up into week.history, advance
//   projectDay(seed, week, day, ...)       → a future day's plan, without changing anything
import type { EngineFeature, Rules, SimState, WeekState } from './types';
import { allPlans } from './plan';
import { newDay, type Seed, type StoreRow } from './seed';

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const THURSDAY = 3;
const LETTERS = 'MTWRFSU';
export interface WeekPatterns { patterns: Record<string, { delivery: string; pullUp: string }>; pullUpShare: number }
/** Used when the seed has no week patterns: every store, every day (like the seed Thursday). */
const EVERY_DAY: WeekPatterns = { patterns: { LF: { delivery: LETTERS, pullUp: '' } }, pullUpShare: 0.3 };
const patternsOf = (seed: Seed) => seed.week ?? EVERY_DAY;

/** Is this store visited on this day, and how? */
export function visitOn(row: Pick<StoreRow, 'routeType'>, day: number, wp: WeekPatterns = EVERY_DAY): 'delivery' | 'pullUp' | null {
  const p = wp.patterns[row.routeType ?? 'LF'] ?? wp.patterns.LF ?? EVERY_DAY.patterns.LF;
  const letter = LETTERS[day];
  if (p.delivery.includes(letter)) return 'delivery';
  if (p.pullUp.includes(letter)) return 'pullUp';
  return null;
}

/** A week starting on Monday with nobody's hours worked yet. */
export function freshWeek(seed: Seed): WeekState {
  return { day: 0, history: [], master: {}, fx: {}, startHours: Object.fromEntries(seed.merch.map(m => [m.id, 0])) };
}

/** Paid hours each person has worked so far this week (before today). */
export function hoursBefore(week: WeekState, merchId: string): number {
  return (week.startHours[merchId] ?? 0) + week.history.reduce((h, d) => h + (d.merch[merchId]?.paid ?? 0) / 60, 0);
}

/** The repeatable seed for a day: the scenario id on Thursday, id@Day otherwise. */
export const daySalt = (scenarioId: string, day: number) => (day === THURSDAY ? scenarioId : `${scenarioId}@${DAYS[day]}`);

/** The seed rows for a given day: who's visited, pull-ups, permanent assignments, hours so far. */
export function seedForDay(seed: Seed, week: WeekState, day: number): Seed {
  const shift = seed.rules.shiftStart, wp = patternsOf(seed);
  const stores: StoreRow[] = [];
  for (const row of seed.stores) {
    const kind = visitOn(row, day, wp);
    if (!kind) continue;
    const assignedTo = row.id in week.master ? week.master[row.id] : row.assignedTo;
    stores.push(kind === 'delivery' ? { ...row, assignedTo }
      : { ...row, assignedTo, pullUp: true, truckEta: shift, cases: Math.max(1, Math.round(row.cases * wp.pullUpShare)), trays: Math.round((row.trays ?? 0) * wp.pullUpShare) });
  }
  const merch = seed.merch.map(m => ({ ...m, hoursThisWeek: hoursBefore(week, m.id) }));
  return { ...seed, stores, merch };
}

export interface BuildOptions { rules?: Rules; features?: EngineFeature[] }

/** Build week.day's SimState. */
export function buildDay(seed: Seed, week: WeekState, scenarioId: string, opts: BuildOptions = {}): SimState {
  return newDay(seedForDay(seed, week, week.day), scenarioId, { ...opts, day: week.day, week, salt: daySalt(scenarioId, week.day) });
}

/** Roll today up into the week and move to tomorrow. Runs features' onDayEnd first. */
export function endDay(state: SimState): void {
  for (const h of state.ext.onDayEnd) h(state);
  const merch: Record<string, { paid: number; stops: number; cases: number; trays: number }> = {};
  for (const p of allPlans(state)) merch[p.m.id] = { paid: p.paid, stops: p.stops.length, cases: p.cases, trays: p.trays };
  state.week.history.push({ day: state.day, scenario: state.scenario, merch });
  state.week.day = Math.min(6, state.day + 1);
}

/** A future (or today's starting) day as planned, without touching the real week. */
export function projectDay(seed: Seed, week: WeekState, day: number, scenarioId: string, opts: BuildOptions = {}): SimState {
  const copy: WeekState = { ...week, day, fx: JSON.parse(JSON.stringify(week.fx)), master: { ...week.master }, history: [...week.history] };
  return buildDay(seed, copy, scenarioId, opts);
}

export const isLastDay = (week: WeekState) => week.day >= 6;
