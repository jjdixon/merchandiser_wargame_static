// Display tracking (core). Promotions become display tasks per store; visits record
// display events (setup, check, remove, review) with a compliance result. Several
// requirements share this — the promotion feed (BR-036) loads tasks, the display
// workflow (BR-037) records events, compliance (BR-040), the store page (BR-041) and
// photo review (BR-043) read them — so the model lives here and none of those
// features import each other.
//
// Days are 0 = Mon … 6 = Sun of the simulated week (they can be negative or > 6 for
// promotions that started before or run past it). A display that started before the
// first simulated day of the week is assumed already set up ("carried in").
// A removal counts when its result is 'compliant' (taken down as asked).
import type { DisplayAction, DisplayEvent, DisplayResult, DisplayTask, Promotion, SimState, WeekState } from './types';

export const DISPLAY_RESULTS: DisplayResult[] = ['compliant', 'partially compliant', 'non-compliant', 'absent', 'not applicable', 'unable to verify'];
/** Results that count toward a compliance rate (the rest are excluded from the denominator). */
export const RATED: DisplayResult[] = ['compliant', 'partially compliant', 'non-compliant', 'absent'];

/** Banner (chain) from a store name: "ValuMart #1042" → "ValuMart". */
export const bannerOf = (s: { name: string }) => s.name.split(' #')[0].trim();

/** A store or a seed store row. */
type StoreLike = { id: string; name: string; market?: string; routeType?: string };

/** Does this promotion include this store? No selectors at all = every store. */
export function promotionMatches(p: Promotion, s: StoreLike): boolean {
  if (p.stores?.length && !p.stores.includes(s.id)) return false;
  if (p.banners?.length && !p.banners.includes(bannerOf(s))) return false;
  if (p.markets?.length && !p.markets.includes(s.market ?? '')) return false;
  if (p.routeTypes?.length && !(p.routeTypes as string[]).includes(s.routeType ?? 'LF')) return false;
  return true;
}

/** One task per promotion per matching store. */
export function tasksFromPromotions(promos: Promotion[], stores: StoreLike[]): DisplayTask[] {
  return promos.flatMap(p => stores.filter(s => promotionMatches(p, s)).map(s => {
    const { stores: _a, banners: _b, markets: _c, routeTypes: _d, id, ...rest } = p;
    return { ...rest, id: `${id}@${s.id}`, promoId: id, storeId: s.id };
  }));
}

export const firstSimDay = (week: WeekState) => (week.history.length ? week.history[0].day : week.day);

/** Every display event this week, earlier days first, then today. */
export const displayEvents = (state: SimState): DisplayEvent[] => [...(state.week.displayEvents ?? []), ...state.displays.events];

export function recordDisplay(state: SimState, ev: Omit<DisplayEvent, 'day' | 't'>): DisplayEvent {
  const full: DisplayEvent = { ...ev, day: state.day, t: state.t };
  // One event per task, action and day: a changed answer replaces the earlier one.
  const i = state.displays.events.findIndex(e => e.taskId === ev.taskId && e.action === ev.action && e.day === state.day);
  if (i >= 0) state.displays.events[i] = full; else state.displays.events.push(full);
  return full;
}

/** A manager's review of the latest result (BR-040 / BR-043). */
export function reviewDisplay(state: SimState, taskId: string, result: DisplayResult, by: string, note?: string): DisplayEvent | null {
  const t = state.displays.tasks.find(x => x.id === taskId);
  if (!t) return null;
  const ev: DisplayEvent = { taskId, storeId: t.storeId, action: 'review', result, by, note, day: state.day, t: state.t };
  state.displays.events.push(ev);
  return ev;
}

const SET_UP: DisplayResult[] = ['compliant', 'partially compliant', 'non-compliant'];

export interface DisplayStatus {
  carriedIn: boolean;
  setUpDay: number | null;
  removedDay: number | null;
  closed: boolean;        // not applicable, or removed
  lastVisitDay: number | null;   // last setup/check day
  /** Latest result after reviews (null = nothing recorded yet). */
  result: DisplayResult | null;
  /** The event that result comes from. */
  last: DisplayEvent | null;
  events: DisplayEvent[];
}

/** Where a task stands, from events before `beforeDay` (default: all of them). */
export function displayStatus(state: SimState, task: DisplayTask, beforeDay = Infinity): DisplayStatus {
  const events = displayEvents(state).filter(e => e.taskId === task.id && e.day < beforeDay);
  const carriedIn = task.start < firstSimDay(state.week);
  let setUpDay: number | null = carriedIn ? task.start : null, removedDay: number | null = null, closed = false, lastVisitDay: number | null = null;   // carried-in displays get checked on the first visit
  let last: DisplayEvent | null = null, result: DisplayResult | null = carriedIn ? 'compliant' : null;
  for (const e of events) {
    if (e.action === 'setup' && setUpDay == null && SET_UP.includes(e.result)) setUpDay = e.day;
    if (e.action === 'setup' && e.result === 'not applicable') closed = true;
    if (e.action === 'remove' && e.result === 'compliant') { removedDay = e.day; closed = true }
    if (e.action === 'setup' || e.action === 'check') lastVisitDay = e.day;
    if (e.action !== 'remove') { result = e.result; last = e }
  }
  return { carriedIn, setUpDay, removedDay, closed, lastVisitDay, result, last, events };
}

/** What the visit should do about this display today, if anything. */
export function dueAction(state: SimState, task: DisplayTask): DisplayAction | null {
  if (!state.stores.some(s => s.id === task.storeId)) return null;
  const st = displayStatus(state, task, state.day);
  if (st.closed) return null;
  if (state.day > task.end) return st.setUpDay != null ? 'remove' : null;
  if (state.day < task.start) return null;
  if (st.setUpDay == null) return 'setup';
  if (st.lastVisitDay == null || state.day - st.lastVisitDay >= Math.max(1, task.checkEvery)) return 'check';
  return null;
}

/** Days a setup is late (0 = due today or not due). */
export function overdueDays(state: SimState, task: DisplayTask): number {
  const st = displayStatus(state, task, state.day);
  if (st.closed || st.setUpDay != null || state.day > task.end) return 0;
  return Math.max(0, state.day - task.start);
}

/** Today's tasks for one store. */
export const tasksFor = (state: SimState, storeId: string) => state.displays.tasks.filter(t => t.storeId === storeId);
