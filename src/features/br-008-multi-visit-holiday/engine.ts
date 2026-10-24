// BR-008 Holiday and multiple-visit scheduling.
// - Planned second visits: some stores get a merchandising-only second visit on
//   certain days, often by a different person (relief, jumper), from patterns.json.
// - Holiday pattern: pick a holiday day for the week. That day has no deliveries
//   (light pull-ups only), the day before builds up (×1.3) and the day after
//   catches up (×1.5), applied automatically when each day is built.
import {
  DAYS, parseHHMM, raise, ruleNum,
  type EngineFeature, type SimState, type Store,
} from '../../engine';
import DATA from './patterns.json';

export const ID = 'br-008-multi-visit-holiday';
const HOLIDAY = 'br008.holiday';
const LETTERS = 'MTWRFSU';

export interface SecondVisit { store: string; days: string; at: string; doneBy: string; share: number; assignTo: string | null; why: string }
export const SECOND: SecondVisit[] = DATA.secondVisits;

export const holidayDay = (state: SimState) => {
  const d = Math.round(ruleNum(state.rules, HOLIDAY, -1));
  return d >= 0 && d <= 6 ? d : -1;
};

/** Second-visit stops added today. */
export const secondVisitsToday = (state: SimState) => state.stores.filter(s => s.id.endsWith('~2nd'));

export function onDayStart(state: SimState): void {
  const hol = holidayDay(state), H = DATA.holiday;
  if (hol >= 0) {
    if (state.day === hol) {
      for (const s of state.stores) { s.pullUp = true; s.eta = state.rules.shiftStart; s.cases = Math.max(1, Math.round(s.cases * H.holidayPullUpShare)) }
      raise(state, 'info', `${DAYS[hol]} is a holiday: no deliveries, light pull-ups only.`);
    } else if (state.day === hol - 1 || state.day === hol + 1) {
      const f = state.day === hol - 1 ? H.beforeFactor : H.afterFactor;
      for (const s of state.stores) if (!s.pullUp) s.cases = Math.round(s.cases * f);
      raise(state, 'info', `${state.day === hol - 1 ? 'Pre-holiday build' : 'Post-holiday catch-up'}: orders ×${f} today.`);
    }
  }
  for (const v of SECOND) {
    if (!v.days.includes(LETTERS[state.day])) continue;
    const base = state.stores.find(s => s.id === v.store);
    if (!base || (hol === state.day)) continue;
    const n: Store = {
      ...base, id: `${base.id}~2nd`, name: `${base.name} · 2nd visit`, pullUp: true, extra: 0, lock: null, answers: {},
      cases: Math.max(1, Math.round(base.cases * v.share)), eta: parseHHMM(v.at), win: parseHHMM(v.doneBy),
      assign: v.assignTo && state.merch.some(m => m.id === v.assignTo) ? v.assignTo : base.assign, seq: 99,
    };
    state.stores.push(n);
  }
}

export const br008MultiVisitHolidayEngine: EngineFeature = {
  id: ID,
  title: 'Second visits and holidays',
  description: 'Planned merchandising-only second visits (often by a different person) and an automatic holiday pattern: no deliveries on the day, build-up before, catch-up after.',
  requirements: ['BR-008'],
  defaultOn: true,
  ruleDefaults: { [HOLIDAY]: -1 },
  settings: [{ key: HOLIDAY, label: 'Holiday this week (0 = Mon … 6 = Sun, −1 = none)', help: 'Applies when each day is built; reset the day to see it', type: 'number', step: 1, section: 'Holidays' }],
  onDayStart,
};
