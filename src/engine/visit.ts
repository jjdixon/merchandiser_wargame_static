// Store visit steps (core). Collects steps from every enabled feature, records
// answers, and reports progress. The guided-visit feature is the UI on top.
import { PHASE_ORDER, type SimState, type StepAnswer, type Store, type VisitStep } from './types';

/** Every step for this store's visit, in phase then order, after adjustStep hooks. */
export function visitSteps(state: SimState, s: Store): VisitStep[] {
  const steps = state.ext.visitSteps.flatMap(h => h(state, s))
    .map(step => state.ext.adjustStep.reduce((x, h) => h(state, s, x), step));
  return steps.sort((a, b) => PHASE_ORDER.indexOf(a.phase) - PHASE_ORDER.indexOf(b.phase) || (a.order ?? 100) - (b.order ?? 100));
}

/** Is this answer enough for the step to count as done? */
export function isAnswered(step: VisitStep, a: StepAnswer | undefined): boolean {
  if (!a) return false;
  if (step.photo === 'required' && !a.photo) return false;
  switch (step.kind) {
    case 'check': return !!a.done;
    case 'count': return typeof a.count === 'number' && a.count >= 0;
    case 'choice': return !!a.choice;
    case 'entries': return !!a.done;
  }
}

export interface VisitProgress {
  steps: VisitStep[];
  required: number;
  doneRequired: number;
  /** All required steps answered. */
  complete: boolean;
  /** First unanswered step (required first), if any. */
  next: VisitStep | null;
}

export function visitProgress(state: SimState, s: Store): VisitProgress {
  const steps = visitSteps(state, s);
  const req = steps.filter(x => x.required);
  const doneRequired = req.filter(x => isAnswered(x, s.answers[x.id])).length;
  const next = req.find(x => !isAnswered(x, s.answers[x.id])) ?? steps.find(x => !isAnswered(x, s.answers[x.id])) ?? null;
  return { steps, required: req.length, doneRequired, complete: doneRequired === req.length, next };
}

/**
 * Record an answer (merged with any earlier partial answer, e.g. a photo added
 * after ticking) and notify every enabled feature's onStepAnswered.
 */
export function answerStep(state: SimState, s: Store, stepId: string, answer: Omit<StepAnswer, 'at'>): void {
  const step = visitSteps(state, s).find(x => x.id === stepId);
  if (!step) return;
  const merged: StepAnswer = { ...s.answers[stepId], ...answer, at: state.t };
  s.answers[stepId] = merged;
  for (const h of state.ext.onStepAnswered) h(state, s, step, merged);
}

/** Repeatable 0..1 from a string, for deterministic "random" simulation choices. */
export function hash01(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619) }
  return ((h >>> 0) % 100000) / 100000;
}
