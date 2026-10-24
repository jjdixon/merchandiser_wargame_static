// BR-005 Vacation and cross-model relief coverage.
// Vacations are booked per person per day. When a day is built, people on vacation
// are off and their stops go to the relief pool: qualified for the store's route type
// (LF / Traditional / Xpress), same market first. Relief people who end up with no
// work are shown as available for productive work (helping, pull-ups).
import {
  DAYS, nextSeq, raise, ruleBool, weekState,
  type EngineFeature, type Merchandiser, type SimState,
} from '../../engine';
import SEED from './vacations.json';

export const ID = 'br-005-relief-coverage';
const AUTO = 'br005.autoRelief';

export interface Vacation { merch: string; day: number }
export const vacations = (state: SimState) => weekState<Vacation[]>(state, ID, () => SEED.booked.map(v => ({ ...v })));

export function book(state: SimState, merch: string, day: number): boolean {
  const v = vacations(state);
  if (day < state.day || v.some(x => x.merch === merch && x.day === day)) return false;
  v.push({ merch, day });
  return true;
}
export function cancel(state: SimState, merch: string, day: number): void {
  const v = vacations(state), i = v.findIndex(x => x.merch === merch && x.day === day);
  if (i >= 0 && day > state.day) v.splice(i, 1);
}

export const reliefPool = (state: SimState) => state.merch.filter(m => m.role === 'relief' && !m.out);
export const offToday = (state: SimState) => vacations(state).filter(v => v.day === state.day).map(v => v.merch);

/** Idle relief: in the pool with nothing assigned today. */
export const idleRelief = (state: SimState) => reliefPool(state).filter(m => !state.stores.some(s => s.assign === m.id));

export function onDayStart(state: SimState): void {
  const off = offToday(state);
  for (const id of off) {
    const m = state.merch.find(x => x.id === id);
    if (!m) continue;
    m.out = true;
    const released = state.stores.filter(s => s.assign === id);
    released.forEach(s => (s.assign = null));
    let covered = 0;
    if (ruleBool(state.rules, AUTO, true)) for (const s of released) {
      const pool = reliefPool(state).filter(r => r.routeTypes.includes(s.routeType));
      const pick: Merchandiser | undefined = pool.find(r => r.market === s.market) ?? pool[0];
      if (pick) { s.assign = pick.id; s.seq = nextSeq(state, pick.id); covered++ }
    }
    raise(state, covered === released.length ? 'info' : 'bad',
      `${m.name} is on vacation ${DAYS[state.day]}: ${covered} of ${released.length} stop${released.length === 1 ? '' : 's'} covered by relief${covered < released.length ? ' — the rest need coverage' : ''}.`);
  }
}

export const br005ReliefCoverageEngine: EngineFeature = {
  id: ID,
  title: 'Vacation and relief',
  description: 'Book vacations by day; the relief pool covers stops it\'s qualified for (route type, same market first); idle relief is offered as available.',
  requirements: ['BR-005'],
  defaultOn: true,
  ruleDefaults: { [AUTO]: true },
  settings: [{ key: AUTO, label: 'Relief covers vacations automatically', help: 'Off = released stops wait for the scheduler', type: 'boolean', section: 'Relief' }],
  onDayStart,
};
