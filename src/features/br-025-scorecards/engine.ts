// BR-025 KPI scorecards and coaching.
// End-of-day scorecard per merchandiser, kept for the week, against goals that are
// settings (the business hasn't approved KPI definitions yet — these are drafts):
//   adherence      stops finished by the store's done-by time ÷ stops finished
//   completion     stops finished ÷ stops on the route today
//   units / hour   trays + cases worked ÷ in-store work hours
//   steps          required visit steps done ÷ required (finished stops)
//   displays       compliant ÷ rated display results recorded by this person
//   out-of-stocks  found and recorded (no goal: more found isn't worse)
//   exceptions     warnings and problems naming this person
//   paid / OT / miles
// Sales isn't simulated (no data), so it's left out.
import {
  DAYS, RATED, displayEvents, plan, ruleNum, visitProgress, visitSteps, weekState,
  type EngineFeature, type Merchandiser, type SimState,
} from '../../engine';

export const ID = 'br-025-scorecards';
export const GOALS = { adherence: 'br025.adherence', completion: 'br025.completion', uph: 'br025.uph', steps: 'br025.steps', displays: 'br025.displays' } as const;
const DEFAULTS = { [GOALS.adherence]: 90, [GOALS.completion]: 100, [GOALS.uph]: 60, [GOALS.steps]: 100, [GOALS.displays]: 80 };

export interface Card {
  merchId: string; name: string; role: string; day: number;
  stops: number; done: number; onTime: number;
  units: number; workMin: number;
  stepsReq: number; stepsDone: number;
  displaysRated: number; displaysOk: number;
  oos: number; exceptions: number;
  paidH: number; otH: number; miles: number;
}

export function card(state: SimState, m: Merchandiser): Card {
  const p = plan(state, m), done = p.stops.filter(x => x.s.lock && state.t >= x.end);
  let stepsReq = 0, stepsDone = 0, oos = 0;
  for (const x of done) {
    const pr = visitProgress(state, x.s);
    stepsReq += pr.required; stepsDone += pr.doneRequired;
    for (const st of visitSteps(state, x.s)) if (st.phase === 'oos' && st.kind === 'entries') oos += x.s.answers[st.id]?.entries?.length ?? 0;
  }
  const ev = displayEvents(state).filter(e => e.day === state.day && e.by === m.name && e.action !== 'review' && RATED.includes(e.result));
  const first = m.name.split(' ')[0];
  return {
    merchId: m.id, name: m.name, role: m.role, day: state.day,
    stops: p.stops.length, done: done.length, onTime: done.filter(x => x.end <= x.s.win).length,
    units: done.reduce((n, x) => n + x.s.trays + x.s.cases, 0), workMin: done.reduce((n, x) => n + (x.end - x.start), 0),
    stepsReq, stepsDone, displaysRated: ev.length, displaysOk: ev.filter(e => e.result === 'compliant').length,
    oos, exceptions: state.alerts.filter(a => a.sev !== 'info' && (a.text.includes(m.name) || a.text.startsWith(first + ' '))).length,
    paidH: p.paid / 60, otH: p.oth, miles: p.miles,
  };
}

export const cards = (state: SimState, who: (m: Merchandiser) => boolean = () => true) =>
  state.merch.filter(m => who(m)).map(m => card(state, m)).filter(c => c.stops > 0 || c.paidH > 0);

/** Add cards up (for a week, or a team). */
export function sum(list: Card[], name = 'Total'): Card {
  const z: Card = { merchId: '', name, role: '', day: -1, stops: 0, done: 0, onTime: 0, units: 0, workMin: 0, stepsReq: 0, stepsDone: 0, displaysRated: 0, displaysOk: 0, oos: 0, exceptions: 0, paidH: 0, otH: 0, miles: 0 };
  for (const c of list) for (const k of Object.keys(z) as (keyof Card)[]) if (typeof z[k] === 'number' && k !== 'day') (z[k] as number) += c[k] as number;
  return z;
}

export interface Kpis { adherence: number | null; completion: number | null; uph: number | null; steps: number | null; displays: number | null }
const ratio = (a: number, b: number) => (b ? a / b : null);
export const kpis = (c: Card): Kpis => ({
  adherence: ratio(c.onTime, c.done), completion: ratio(c.done, c.stops), uph: c.workMin ? c.units / (c.workMin / 60) : null,
  steps: ratio(c.stepsDone, c.stepsReq), displays: ratio(c.displaysOk, c.displaysRated),
});

export const goals = (state: SimState) => ({
  adherence: ruleNum(state.rules, GOALS.adherence, 90) / 100, completion: ruleNum(state.rules, GOALS.completion, 100) / 100,
  uph: ruleNum(state.rules, GOALS.uph, 60), steps: ruleNum(state.rules, GOALS.steps, 100) / 100, displays: ruleNum(state.rules, GOALS.displays, 80) / 100,
});

/** Did this KPI meet its goal? null = nothing to judge yet. */
export function meets(k: keyof Kpis, v: number | null, state: SimState): boolean | null {
  if (v == null) return null;
  return v >= goals(state)[k] - 1e-9;
}

/** Finished days this week. */
export const history = (state: SimState) => weekState<Card[]>(state, ID, () => []);
export function onDayEnd(state: SimState): void {
  history(state).push(...cards(state));
}
/** This week so far (finished days + today), one card per person. */
export function weekCards(state: SimState, who: (m: Merchandiser) => boolean = () => true): Card[] {
  const all = [...history(state), ...cards(state, who)];
  return state.merch.filter(who).map(m => ({ ...sum(all.filter(c => c.merchId === m.id), m.name), merchId: m.id, role: m.role }))
    .filter(c => c.stops > 0 || c.paidH > 0);
}
export const daysCounted = (state: SimState) => [...new Set(history(state).map(c => c.day)), state.day].map(d => DAYS[d]);

export const br025ScorecardsEngine: EngineFeature = {
  id: ID,
  title: 'Scorecards',
  description: 'End-of-day and week-to-date scorecard per merchandiser against draft goals, with a manager comparison.',
  requirements: ['BR-025'],
  defaultOn: true,
  ruleDefaults: DEFAULTS,
  settings: [
    { key: GOALS.adherence, label: 'Goal: on-time stops (%)', help: 'Finished by the store\'s done-by time', type: 'number', step: 5, section: 'Scorecard goals (draft)' },
    { key: GOALS.completion, label: 'Goal: route completion (%)', help: 'Stops finished ÷ stops on the route', type: 'number', step: 5, section: 'Scorecard goals (draft)' },
    { key: GOALS.uph, label: 'Goal: units per work hour', help: 'Trays + cases ÷ in-store hours', type: 'number', step: 5, section: 'Scorecard goals (draft)' },
    { key: GOALS.steps, label: 'Goal: visit steps done (%)', help: 'Required steps answered', type: 'number', step: 5, section: 'Scorecard goals (draft)' },
    { key: GOALS.displays, label: 'Goal: displays compliant (%)', help: 'Of the display results this person recorded', type: 'number', step: 5, section: 'Scorecard goals (draft)' },
  ],
  onDayEnd,
};
