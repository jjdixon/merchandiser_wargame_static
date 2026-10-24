import { describe, expect, it } from 'vitest';
import { answerStep, newDay, plan, storeById, tick, visitProgress, visitSteps } from '../../engine';
import { seed } from '../../data';
import { aislesFor, autoComplete, br002GuidedVisitEngine, canCloseOut, closeOut, setPlaying, visitState } from './engine';

const day = () => newDay(seed, 'normal', { features: [br002GuidedVisitEngine] });
const startWork = (s: ReturnType<typeof day>, id: string) => { const st = storeById(s, id)!; while (!st.lock || s.t < st.lock.start) tick(s, 1); return st };

describe('br-002-guided-visit [BR-002 BR-015 BR-021]', () => {
  it('builds the MVP order: backstock, receive, each aisle, validate', () => {
    const s = day(), st = storeById(s, 's1')!;
    const titles = visitSteps(s, st).map(x => x.title);
    expect(titles[0]).toBe('Note backstock');
    expect(titles[1]).toBe('Check in the delivery');
    expect(titles.slice(2, 2 + aislesFor(st).length)).toEqual(aislesFor(st).map(a => `Work ${a}`));
    expect(titles.at(-1)).toBe('Validate the set');
  });

  it('simulated merchandisers finish their steps automatically when work time ends', () => {
    const s = day(), st = storeById(s, 's8')!;
    while (!st.lock || s.t < st.lock.end) tick(s, 1);
    tick(s, 1);
    expect(visitProgress(s, st).complete).toBe(true);
    expect(Object.values(st.answers).every(a => a.auto)).toBe(true);
    expect(visitState(s).closed.s8).toBeDefined();
  });

  it('close-out is blocked until every required step is done, then ends the visit now', () => {
    const s = day(), st = startWork(s, 's1');
    setPlaying(s, 'ana', true);
    tick(s, 20);
    expect(canCloseOut(s, st)).toBe(false);
    for (const step of visitSteps(s, st)) answerStep(s, st, step.id, step.kind === 'count' ? { count: 4 } : { done: true });
    expect(canCloseOut(s, st)).toBe(true);
    const plannedEnd = st.lock!.end;
    expect(closeOut(s, st)).toBe(true);
    expect(st.lock!.end).toBe(s.t);
    expect(st.lock!.end).toBeLessThan(plannedEnd);
    expect(plan(s, s.merch[0]).stops[1].depart).toBe(s.t);   // next stop pulls in
  });

  it('a played visit stays open past the standard until the player closes out', () => {
    const s = day(), st = startWork(s, 's1');
    setPlaying(s, 'ana', true);
    const standardEnd = st.lock!.end;
    tick(s, standardEnd - s.t + 30);
    expect(st.lock!.end).toBeGreaterThan(s.t);
    expect(visitState(s).closed.s1).toBeUndefined();
    expect(s.alerts.some(a => a.text.includes('past the standard time'))).toBe(true);
  });

  it('stopping play hands the visit back to the simulation', () => {
    const s = day(), st = startWork(s, 's1');
    setPlaying(s, 'ana', true);
    tick(s, 30);
    setPlaying(s, 'ana', false);
    tick(s, st.lock!.end - s.t + 1);
    expect(visitState(s).closed.s1).toBeDefined();
  });

  it('auto-complete attaches a simulated photo where one is required', () => {
    const s = newDay(seed, 'normal', { features: [br002GuidedVisitEngine, {
      id: 'needs-photo', title: 't', description: 't', requirements: [], defaultOn: true,
      adjustStep: (_st, _s, step) => (step.phase === 'validate' ? { ...step, photo: 'required' } : step),
    }] });
    const st = storeById(s, 's2')!;
    autoComplete(s, st);
    expect(st.answers['br-002-guided-visit:validate'].photo?.simulated).toBe(true);
    expect(visitProgress(s, st).complete).toBe(true);
  });
});
