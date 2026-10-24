// BR-002 / BR-015 / BR-021 Guided store visit.
// The in-store workflow from the business MVP feedback:
//   note backstock → each display → each aisle → validate → out-of-stocks → close out.
// This feature adds the backstock, aisle and validate steps; other features add
// theirs (displays, out-of-stocks) through the core visitSteps plug-in.
//
// War-game mechanics:
// - A person can "play" a merchandiser on the phone. While they play, a visit stays
//   open until they close it out, so their real speed becomes the labor time.
// - Everyone else is simulated: when their planned work time ends, remaining steps
//   are answered automatically (each step's autoAnswer, or a sensible default).
import {
  adjustWork, answerStep, featureState, hash01, isAnswered, merchById, raise, visitProgress, visitSteps,
  type EngineFeature, type SimState, type StepAnswer, type Store, type VisitStep,
} from '../../engine';
import AISLES from './aisles.json';

export const ID = 'br-002-guided-visit';

export interface VisitState {
  /** Merchandisers being played by a person on the phone. */
  playing: Record<string, true>;
  /** Visits closed out: store id → sim time. */
  closed: Record<string, number>;
}
export const visitState = (state: SimState) => featureState<VisitState>(state, ID, () => ({ playing: {}, closed: {} }));

export function aislesFor(s: Store): string[] {
  const byChain = AISLES.byChain as Record<string, string[]>;
  const chain = Object.keys(byChain).find(c => s.name.startsWith(c));
  return chain ? byChain[chain] : AISLES.default;
}

export function baseSteps(_state: SimState, s: Store): VisitStep[] {
  const step = (x: Omit<VisitStep, 'featureId'>): VisitStep => ({ featureId: ID, ...x });
  return [
    step({ id: `${ID}:backstock`, phase: 'backstock', order: 10, kind: 'count', unit: 'cases', required: true,
      title: 'Note backstock', detail: 'Count cases already in the backroom before the new delivery.',
      autoAnswer: (st, x) => ({ count: Math.round(hash01(`${st.scenario}|${x.id}|backstock`) * 24) }) }),
    step({ id: `${ID}:receive`, phase: 'backstock', order: 20, kind: 'check', required: true, needsProduct: true,
      title: 'Check in the delivery', detail: 'Count it in with receiving and sign the invoice.' }),
    ...aislesFor(s).map((a, i) => step({
      id: `${ID}:aisle:${i}`, phase: 'aisle', order: i, kind: 'check', required: true, needsProduct: true,
      title: `Work ${a}`, detail: 'Fill, rotate (oldest to front), face.' })),
    step({ id: `${ID}:validate`, phase: 'validate', order: 10, kind: 'check', required: true, needsProduct: true,
      title: 'Validate the set', detail: 'Shelves full, rotated, faced; tags match product.' }),
  ];
}

/** Answer every unanswered step the way a simulated merchandiser would. */
export function autoComplete(state: SimState, s: Store): void {
  for (const step of visitSteps(state, s)) {
    if (isAnswered(step, s.answers[step.id])) continue;
    const a: Omit<StepAnswer, 'at'> = step.autoAnswer?.(state, s) ?? defaultAnswer(step);
    const photo = step.photo === 'required' && !a.photo ? { photo: { name: 'simulated photo', at: state.t, simulated: true } } : {};
    answerStep(state, s, step.id, { ...a, ...photo, auto: true });
  }
}
function defaultAnswer(step: VisitStep): Omit<StepAnswer, 'at'> {
  switch (step.kind) {
    case 'check': return { done: true };
    case 'count': return { count: 0 };
    case 'choice': return { choice: step.options?.[0] ?? 'n/a' };
    case 'entries': return { done: true, entries: [] };
  }
}

/** Can this visit be closed out right now? */
export function canCloseOut(state: SimState, s: Store): boolean {
  const L = s.lock;
  return !!L && state.t >= L.start && !visitState(state).closed[s.id] && visitProgress(state, s).complete;
}

/** Close out the visit now. If it's earlier than planned, the visit ends now. */
export function closeOut(state: SimState, s: Store): boolean {
  if (!canCloseOut(state, s)) return false;
  const L = s.lock!;
  visitState(state).closed[s.id] = state.t;
  if (state.t < L.end) adjustWork(state, s, state.t - L.end);
  return true;
}

export function setPlaying(state: SimState, merchId: string, on: boolean): void {
  const p = visitState(state).playing;
  if (on) p[merchId] = true; else delete p[merchId];
}

export function onTick(state: SimState): void {
  const vs = visitState(state);
  for (const s of state.stores) {
    const L = s.lock;
    if (!L || !s.assign || vs.closed[s.id]) continue;
    if (vs.playing[s.assign]) {
      // Hold the visit open until the player closes out.
      if (state.t >= L.start && L.end - state.t < 1.5) {
        adjustWork(state, s, state.t + 2 - L.end);
        const m = merchById(state, s.assign);
        raise(state, 'info', `${m?.name ?? 'Merchandiser'} is still working ${s.name} past the standard time.`, `${ID}:over:${s.id}`);
      }
    } else if (state.t >= L.end) {
      autoComplete(state, s);
      vs.closed[s.id] = L.end;
    }
  }
}

export const br002GuidedVisitEngine: EngineFeature = {
  id: ID,
  title: 'Guided store visit',
  description: 'Step-by-step visit on the phone (backstock → displays → aisles → validate → out-of-stocks), gated close-out, and "play this merchandiser".',
  requirements: ['BR-002', 'BR-015', 'BR-021'],
  defaultOn: true,
  visitSteps: baseSteps,
  onTick,
};

/* ---------- practice visit (sandbox) ----------
 * A throwaway copy of the day for clicking through any store's visit without the
 * clock: every step unlocked, nothing written back. Other features' hooks still run
 * (out-of-stock routing, photo records), but only against the copy.
 */
export interface Practice { state: SimState; storeId: string; closedAt: number | null }

/** Copy the day so practice answers can't leak into it. */
export function sandboxOf(state: SimState): SimState {
  return {
    ...state,
    merch: state.merch.map(m => ({ ...m })),
    stores: state.stores.map(s => ({ ...s, lock: s.lock ? { ...s.lock } : null, answers: {} })),
    alerts: [],
    fired: {},
    // Feature day-state is plain data; a JSON copy keeps it separate.
    fx: JSON.parse(JSON.stringify(state.fx)),
  };
}

export function startPractice(state: SimState, storeId: string): Practice | null {
  if (!state.stores.some(s => s.id === storeId)) return null;
  const sb = sandboxOf(state);
  delete sb.fx[ID];                                  // fresh visit state in the copy
  return { state: sb, storeId, closedAt: null };
}

/** In practice, close-out only needs the required steps; there's no clock or truck. */
export function practiceCloseOut(p: Practice): boolean {
  const s = p.state.stores.find(x => x.id === p.storeId);
  if (!s || !visitProgress(p.state, s).complete) return false;
  p.closedAt = p.state.t;
  return true;
}
