// BR-041 Store profile, notes and supporting context.
// A store page (reachable from store names on every core screen) with the store's
// identifiers, address, banner, route and brand coverage, contacts and constraints,
// today's open tasks, this week's history and display performance — plus structured
// notes (category, author, visibility, follow-up) that carry over between visits,
// days and workers.
import {
  RATED, bannerOf, displayEvents, displayStatus, dueAction, overdueDays, weekState,
  type DisplayAction, type DisplayEvent, type DisplayTask, type EngineFeature, type SimState, type Store,
} from '../../engine';
import PROFILES from './profiles.json';
import NOTES from './notes.json';

export const ID = 'br-041-store-profile';

export interface Profile { address: string; storeNumber: string; contacts: Array<{ role: string; name: string }>; constraints: string[]; brands: string[] }
export const CATEGORIES = NOTES.categories;
export type Visibility = 'everyone' | 'leaders';
export interface Note { id: number; storeId: string; category: string; text: string; author: string; visibility: Visibility; followUp: boolean; done?: boolean; day: number; t?: number }

export const profileOf = (storeId: string): Profile | null => (PROFILES.profiles as Record<string, Profile>)[storeId] ?? null;

interface NoteState { list: Note[]; next: number }
export const notes = (state: SimState) => weekState<NoteState>(state, ID, () => ({
  list: (NOTES.notes as Omit<Note, 'id'>[]).map((n, i) => ({ ...n, id: i + 1 })), next: NOTES.notes.length + 1,
}));

export function addNote(state: SimState, n: Omit<Note, 'id' | 'day' | 't' | 'done'>): Note | null {
  const text = n.text.trim();
  if (!text) return null;
  const ns = notes(state), note: Note = { ...n, text, id: ns.next++, day: state.day, t: state.t };
  ns.list.push(note);
  return note;
}
export function resolveNote(state: SimState, id: number): void {
  const n = notes(state).list.find(x => x.id === id);
  if (n) n.done = true;
}

/** Notes this viewer may see, newest first; optional text search across text, category and author. */
export function notesFor(state: SimState, opts: { storeId?: string; leader: boolean; q?: string }): Note[] {
  const q = opts.q?.trim().toLowerCase();
  return notes(state).list
    .filter(n => (!opts.storeId || n.storeId === opts.storeId) && (opts.leader || n.visibility === 'everyone'))
    .filter(n => !q || `${n.text} ${n.category} ${n.author}`.toLowerCase().includes(q))
    .sort((a, b) => b.day - a.day || (b.t ?? 0) - (a.t ?? 0) || b.id - a.id);
}

export interface OpenTask { task: DisplayTask; action: DisplayAction; late: number }
export function openTasks(state: SimState, s: Store): OpenTask[] {
  return state.displays.tasks.filter(t => t.storeId === s.id)
    .map(t => ({ task: t, action: dueAction(state, t)!, late: overdueDays(state, t) })).filter(x => x.action);
}

export const historyFor = (state: SimState, storeId: string): DisplayEvent[] =>
  displayEvents(state).filter(e => e.storeId === storeId).sort((a, b) => b.day - a.day || b.t - a.t);

/** Display compliance at this store right now (compliant ÷ rated). */
export function storeCompliance(state: SimState, storeId: string): { rate: number | null; rated: number } {
  const results = state.displays.tasks.filter(t => t.storeId === storeId && t.start <= state.day).map(t => displayStatus(state, t).result);
  const rated = results.filter(r => r && RATED.includes(r)).length;
  return { rate: rated ? results.filter(r => r === 'compliant').length / rated : null, rated };
}

export const banner = bannerOf;

export const br041StoreProfileEngine: EngineFeature = {
  id: ID,
  title: 'Store page and notes',
  description: 'A store page linked from every screen: profile, contacts, constraints, open tasks, history, display performance and structured notes.',
  requirements: ['BR-041'],
  defaultOn: true,
};
