// BR-004 Dynamic route and store reassignment.
// A scheduler can move a store to someone else for **today only** (the default:
// master ownership doesn't change), **from tomorrow on** (changes the permanent owner
// in the week), or both; or **split** a store's work so a second person takes a share.
// Moving a whole route moves every open stop of one person to another.
// Every action is kept in a week-long history.
import {
  DAYS, assign, merchById, raise, splitWork, weekState,
  type EngineFeature, type SimState,
} from '../../engine';

export const ID = 'br-004-reassignment';
export type Scope = 'today' | 'permanent' | 'both';
export interface Action { day: number; at: number; text: string }
export const history = (state: SimState) => weekState<Action[]>(state, ID, () => []);

const log = (state: SimState, text: string) => { history(state).push({ day: state.day, at: state.t, text }); raise(state, 'info', text) };
const nm = (state: SimState, id: string | null) => (id ? merchById(state, id)?.name ?? id : 'nobody');

/** Move one store. Returns false if it can't move (already started, unknown). */
export function reassign(state: SimState, storeId: string, to: string | null, scope: Scope): boolean {
  const s = state.stores.find(x => x.id === storeId);
  if (!s) return false;
  const from = s.assign;
  if (scope !== 'permanent') {
    if (s.lock) return false;
    assign(state, s, to);
  }
  if (scope !== 'today') state.week.master[storeId] = to;
  log(state, `${s.name}: ${nm(state, from)} → ${nm(state, to)} (${scope === 'today' ? 'today only' : scope === 'permanent' ? `from ${DAYS[Math.min(6, state.day + 1)]} on` : 'today and from now on'}).`);
  return true;
}

/** Move every open stop of one person to another, today only. */
export function moveRoute(state: SimState, from: string, to: string): number {
  const open = state.stores.filter(s => s.assign === from && !s.lock);
  open.forEach(s => assign(state, s, to));
  if (open.length) log(state, `Route move: ${open.length} open stop${open.length > 1 ? 's' : ''} from ${nm(state, from)} to ${nm(state, to)} (today only).`);
  return open.length;
}

/** Split a share of a store's remaining work to a second person. */
export function split(state: SimState, storeId: string, to: string, share: number): boolean {
  const s = state.stores.find(x => x.id === storeId);
  if (!s) return false;
  const n = splitWork(state, s, to, share, 'split');
  if (!n) return false;
  log(state, `${s.name} split: ${n.cases} cases to ${nm(state, to)}, ${s.cases} stay with ${nm(state, s.assign)}.`);
  return true;
}

export const br004ReassignmentEngine: EngineFeature = {
  id: ID,
  title: 'Reassign and split',
  description: 'Move a store today only, from tomorrow on (master owner), or both; move a whole route; split a store between two people.',
  requirements: ['BR-004'],
  defaultOn: true,
};
