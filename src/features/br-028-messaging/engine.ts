// BR-028 Operational messaging and escalation.
// Role-to-role messages tied to a store, so the conversation stays linked to the
// affected stop. Drivers post automatic updates when a truck slips; messages sent to
// an MSL, scheduler, driver or merchandiser get a simulated reply a few minutes later
// so a war game with one player still feels like a conversation.
import { featureState, fmt, hash01, merchById, type EngineFeature, type SimState, type Store } from '../../engine';
import REPLIES from './replies.json';

export const ID = 'br-028-messaging';
export const ROLES = ['MSL', 'Scheduler', 'Driver', 'Merchandiser'] as const;
export type Role = (typeof ROLES)[number];
const REPLY_AFTER = 4;

export interface Message { id: number; at: number; from: string; to: Role | string; storeId: string | null; text: string; auto?: boolean }
interface MsgState { list: Message[]; nextId: number; seenEta: Record<string, number>; pending: Array<{ due: number; to: Role; storeId: string | null; from: string }> }
export const msgs = (state: SimState) => featureState<MsgState>(state, ID, () => ({ list: [], nextId: 1, seenEta: {}, pending: [] }));

export const labelFor = (state: SimState, storeId: string | null) => (storeId ? state.stores.find(s => s.id === storeId)?.name ?? storeId : 'General');

export function post(state: SimState, m: Omit<Message, 'id' | 'at'>): Message {
  const st = msgs(state);
  const msg: Message = { ...m, id: st.nextId++, at: state.t };
  st.list.push(msg);
  return msg;
}

/** A person sends a message. A simulated reply from the recipient follows shortly. */
export function send(state: SimState, from: string, to: Role, storeId: string | null, text: string): Message | null {
  const t = text.trim();
  if (!t) return null;
  const msg = post(state, { from, to, storeId, text: t });
  msgs(state).pending.push({ due: state.t + REPLY_AFTER, to, storeId, from });
  return msg;
}

/** Name for a role reply about a store, e.g. "MSL North" or the store's merchandiser. */
export function replyName(state: SimState, role: Role, s: Store | undefined): string {
  if (role === 'MSL') return `MSL${s?.market ? ' ' + s.market : ''}`;
  if (role === 'Driver') return `Driver${s ? ' (truck to ' + s.name + ')' : ''}`;
  if (role === 'Merchandiser') return merchById(state, s?.assign ?? '')?.name ?? 'Merchandiser';
  return 'Scheduler';
}

export function onTick(state: SimState): void {
  const st = msgs(state);
  // Driver updates when a truck slips.
  for (const s of state.stores) {
    const prev = st.seenEta[s.id];
    st.seenEta[s.id] = s.eta;
    if (prev == null || s.eta <= prev + 5 || state.t >= s.eta) continue;
    post(state, { from: replyName(state, 'Driver', s), to: 'Merchandiser', storeId: s.id, auto: true,
      text: `Running about ${Math.round(s.eta - prev)} min behind. New ETA ${fmt(s.eta)}.` });
  }
  // Simulated replies.
  for (let i = st.pending.length - 1; i >= 0; i--) {
    const p = st.pending[i];
    if (state.t < p.due) continue;
    st.pending.splice(i, 1);
    const s = state.stores.find(x => x.id === p.storeId) ?? undefined;
    const pool = (REPLIES as Record<string, string[]>)[p.to] ?? ['OK.'];
    const text = pool[Math.floor(hash01(`${state.scenario}|${p.storeId}|${p.due}|${p.to}`) * pool.length)];
    post(state, { from: replyName(state, p.to, s), to: p.from, storeId: p.storeId, text, auto: true });
  }
}

/** Messages about stores a viewer may see (or general ones), newest last. */
export function visibleMessages(state: SimState, canSee: (s: Store) => boolean): Message[] {
  return msgs(state).list.filter(m => { if (!m.storeId) return true; const s = state.stores.find(x => x.id === m.storeId); return !s || canSee(s) });
}

export const br028MessagingEngine: EngineFeature = {
  id: ID,
  title: 'Messaging',
  description: 'Messages between merchandiser, MSL, scheduler and driver, tied to a store; automatic driver updates and simulated replies.',
  requirements: ['BR-028'],
  defaultOn: true,
  onTick,
};
