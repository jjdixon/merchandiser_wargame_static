// BR-022 Display awareness and assignment.
// What displays each store has and what's due today, for the merchandiser's route
// and the scheduler. The data comes from the core display model (engine/display.ts),
// loaded by the promotion feed (BR-036); the visit steps for setup / check / remove
// are the display task workflow (BR-037). This feature is the "playbook" view.
import {
  displayStatus, dueAction, tasksFor,
  type DisplayAction, type DisplayResult, type DisplayTask, type EngineFeature, type SimState, type Store,
} from '../../engine';

export const ID = 'br-022-display-awareness';

export type Phase = 'sold-in' | 'active' | 'expired' | 'removed' | 'not applicable';
export interface StoreDisplay { task: DisplayTask; phase: Phase; due: DisplayAction | null; doneToday: boolean; result: DisplayResult | null }

export function phaseOf(state: SimState, t: DisplayTask): Phase {
  const st = displayStatus(state, t);
  if (st.removedDay != null) return 'removed';
  if (st.closed) return 'not applicable';
  if (state.day > t.end) return 'expired';
  return st.setUpDay != null ? 'active' : 'sold-in';
}

/** Displays at this store worth showing today: due today, live, or not yet taken down. */
export function displaysFor(state: SimState, s: Store): StoreDisplay[] {
  return tasksFor(state, s.id).map(task => {
    const due = dueAction(state, task), st = displayStatus(state, task);
    const doneToday = st.events.some(e => e.day === state.day && e.action !== 'review');
    return { task, phase: phaseOf(state, task), due, doneToday, result: st.result };
  }).filter(d => d.due || d.doneToday || (state.day >= d.task.start && state.day <= d.task.end));
}

export const br022DisplayAwarenessEngine: EngineFeature = {
  id: ID,
  title: 'Display awareness',
  description: 'Each store\'s displays (sold in, active, expired) and what\'s due today, on the route and the scheduler.',
  requirements: ['BR-022'],
  defaultOn: true,
};
