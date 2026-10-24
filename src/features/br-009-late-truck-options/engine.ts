// BR-009 (T-302) Late-truck options: when the next stop's truck isn't in yet, show
// the merchandiser what each choice does to their day before they leave:
//   Wait            keep the order, take the paid wait
//   Go there next   swap it with the following stop (do that one first)
//   Do it last      move it to the end of the day
// Each option shows finish time, paid waiting and how many stops would be late.
import {
  featureState, fmt, plan, raise, ruleBool, ruleNum,
  type EngineFeature, type Merchandiser, type SimState, type Store,
} from '../../engine';

export const ID = 'br-009-late-truck-options';
const THRESHOLD = 'br009lt.waitThreshold', AUTO = 'br009lt.autoBest';

export type OptionId = 'wait' | 'swap' | 'last';
export const OPTION_LABEL: Record<OptionId, string> = { wait: 'Wait for the truck', swap: 'Go to the next store first', last: 'Do this store last' };
export interface Outcome { id: OptionId; finish: number; wait: number; late: number; paid: number }
export interface Decision { merchId: string; store: Store; waitMin: number; options: Outcome[]; best: OptionId }

const decided = (state: SimState) => featureState<Record<string, OptionId>>(state, ID, () => ({}));
const key = (s: Store) => `${s.id}@${Math.round(s.eta)}`;

/** Open stops for this person in route order. */
const openStops = (state: SimState, m: Merchandiser) =>
  state.stores.filter(s => s.assign === m.id && !s.lock).sort((a, b) => a.seq - b.seq);

function reorder(state: SimState, m: Merchandiser, s: Store, opt: OptionId): void {
  const list = openStops(state, m), i = list.indexOf(s);
  if (opt === 'swap' && list[i + 1]) list.splice(i, 2, list[i + 1], s);
  if (opt === 'last') { list.splice(i, 1); list.push(s) }
  list.forEach((x, k) => (x.seq = k + 1));
}

/** What the day looks like under an option. Doesn't change anything. */
export function preview(state: SimState, m: Merchandiser, s: Store, opt: OptionId): Outcome {
  const saved = openStops(state, m).map(x => [x, x.seq] as const);
  reorder(state, m, s, opt);
  const p = plan(state, m);
  for (const [x, q] of saved) x.seq = q;
  return { id: opt, finish: p.clockOut ?? state.t, wait: Math.round(p.wait), late: p.late.length, paid: p.paid };
}

/** Is there a late-truck choice to make for this person right now? */
export function decisionFor(state: SimState, m: Merchandiser): Decision | null {
  if (m.out) return null;
  const next = plan(state, m).stops.find(x => !x.locked);
  if (!next || next.wait < ruleNum(state.rules, THRESHOLD, 20) || decided(state)[key(next.s)]) return null;
  const opts: OptionId[] = ['wait'];
  if (openStops(state, m).length > 1) opts.push('swap', 'last');
  if (opts.length === 1) return null;
  const options = opts.map(o => preview(state, m, next.s, o));
  const best = [...options].sort((a, b) => a.late - b.late || a.finish - b.finish)[0].id;
  return { merchId: m.id, store: next.s, waitMin: Math.round(next.wait), options, best };
}

export function choose(state: SimState, m: Merchandiser, s: Store, opt: OptionId, by: string): void {
  reorder(state, m, s, opt);
  decided(state)[key(s)] = opt;
  raise(state, 'info', `${by}: ${OPTION_LABEL[opt].toLowerCase()} — ${s.name} (${m.name}). Finish ${fmt(plan(state, m).clockOut)}.`);
}

export function onTick(state: SimState): void {
  for (const m of state.merch) {
    const d = decisionFor(state, m);
    if (!d) continue;
    if (ruleBool(state.rules, AUTO, false)) { choose(state, m, d.store, d.best, 'Auto'); continue }
    const alt = d.options.find(o => o.id !== 'wait' && o.finish < d.options[0].finish);
    raise(state, 'warn', `Truck not in at ${d.store.name}: ${m.name} would wait ${d.waitMin} min.${alt ? ` ${OPTION_LABEL[alt.id]} finishes ${fmt(alt.finish)} instead of ${fmt(d.options[0].finish)}.` : ''}`, `${ID}:ask:${key(d.store)}`);
  }
}

export const br009LateTruckOptionsEngine: EngineFeature = {
  id: ID,
  title: 'Late-truck options',
  description: 'When the next stop\'s truck isn\'t in, compare wait / go to the next store first / do it last before leaving.',
  requirements: ['BR-009'],
  defaultOn: true,
  ruleDefaults: { [THRESHOLD]: 20, [AUTO]: false },
  settings: [
    { key: THRESHOLD, label: 'Offer options when waiting at least (min)', help: 'Paid truck wait that triggers the choice', type: 'number', step: 5, section: 'Late trucks' },
    { key: AUTO, label: 'Pick the best option automatically', help: 'Fewest late stops, then earliest finish. Off = someone has to choose.', type: 'boolean', section: 'Late trucks' },
  ],
  onTick,
};
