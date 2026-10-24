// BR-040 Display lifecycle, compliance and exceptions.
// One record per display task from setup to removal: expected vs actual setup and
// removal days, where it is, brand and type, its phase, how long it has been up,
// photos, and the compliance result (compliant, partially compliant, non-compliant,
// absent, not applicable, unable to verify). Results come from the store visit
// (BR-037); managers can review and override them (core reviewDisplay).
import {
  RATED, displayStatus, reviewDisplay,
  type DisplayEvent, type DisplayResult, type DisplayTask, type EngineFeature, type PhotoRef, type SimState,
} from '../../engine';

export const ID = 'br-040-display-compliance';

export type Phase = 'planned' | 'due' | 'overdue' | 'up' | 'expired' | 'removed' | 'not applicable';
export interface DisplayRecord {
  task: DisplayTask;
  phase: Phase;
  expectedSetup: number; actualSetup: number | null;
  expectedRemoval: number; actualRemoval: number | null;
  /** Days up so far (or until removal). */
  daysUp: number;
  result: DisplayResult | null;
  /** Last result came from a manager's review. */
  reviewed: boolean;
  carriedIn: boolean;
  photos: PhotoRef[];
  history: DisplayEvent[];
}

export function record(state: SimState, task: DisplayTask): DisplayRecord {
  const st = displayStatus(state, task);
  let phase: Phase;
  if (st.removedDay != null) phase = 'removed';
  else if (st.closed) phase = 'not applicable';
  else if (state.day > task.end) phase = 'expired';
  else if (st.setUpDay != null) phase = 'up';
  else if (state.day < task.start) phase = 'planned';
  else phase = state.day > task.start ? 'overdue' : 'due';
  const until = st.removedDay ?? Math.min(state.day, task.end + 1);
  return {
    task, phase, expectedSetup: task.start, actualSetup: st.setUpDay, expectedRemoval: task.end + 1, actualRemoval: st.removedDay,
    daysUp: st.setUpDay == null ? 0 : Math.max(0, until - st.setUpDay + (st.removedDay == null && state.day <= task.end ? 1 : 0)),
    result: st.result, reviewed: st.last?.action === 'review', carriedIn: st.carriedIn,
    photos: st.events.flatMap(e => (e.photo ? [e.photo] : [])), history: st.events,
  };
}

/** Records for tasks that have started (or are due) by today. */
export function records(state: SimState, store: (id: string) => boolean = () => true): DisplayRecord[] {
  return state.displays.tasks.filter(t => store(t.storeId) && t.start <= state.day).map(t => record(state, t));
}

export interface Summary { counts: Record<DisplayResult, number>; rated: number; compliant: number; rate: number | null; open: number }
/** Compliance rate = compliant ÷ (compliant + partial + non-compliant + absent). */
export function summarize(list: DisplayRecord[]): Summary {
  const counts = { compliant: 0, 'partially compliant': 0, 'non-compliant': 0, absent: 0, 'not applicable': 0, 'unable to verify': 0 } as Record<DisplayResult, number>;
  let open = 0;
  for (const r of list) { if (r.result) counts[r.result]++; else open++ }
  const rated = RATED.reduce((n, k) => n + counts[k], 0);
  return { counts, rated, compliant: counts.compliant, rate: rated ? counts.compliant / rated : null, open };
}

export function override(state: SimState, taskId: string, result: DisplayResult, by: string, note?: string) {
  return reviewDisplay(state, taskId, result, by, note);
}

export const br040DisplayComplianceEngine: EngineFeature = {
  id: ID,
  title: 'Display compliance',
  description: 'Each display\'s lifecycle (expected vs actual setup and removal, photos, compliance state), with manager review and override.',
  requirements: ['BR-040'],
  defaultOn: true,
};
