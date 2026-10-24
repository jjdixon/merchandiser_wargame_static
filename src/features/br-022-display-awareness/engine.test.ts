import { describe, expect, it } from 'vitest';
import { answerStep, newDay, storeById, visitSteps } from '../../engine';
import { seed } from '../../data';
import { br022DisplayAwarenessEngine, displayDone, displaysFor, displaySteps } from './engine';

const day = () => newDay(seed, 'normal', { features: [br022DisplayAwarenessEngine] });

describe('br-022-display-awareness [BR-022]', () => {
  it('turns a build display into build-then-validate steps', () => {
    const s = day(), st = storeById(s, 's2')!;
    expect(displaySteps(s, st).map(x => x.title)).toEqual(['Build display: Snack cake tower', 'Validate built: Snack cake tower']);
  });

  it('maintain and remove displays get one step each', () => {
    const s = day(), st = storeById(s, 's11')!;
    expect(displaySteps(s, st).map(x => x.title)).toEqual([
      'Build display: BBQ buns pallet', 'Validate built: BBQ buns pallet', 'Remove expired: Spring sandwich promo',
    ]);
  });

  it('steps land in the display phase of the visit; stores without displays get none', () => {
    const s = day();
    expect(visitSteps(s, storeById(s, 's1')!).every(x => x.phase === 'display')).toBe(true);
    expect(displaysFor(storeById(s, 's3')!)).toEqual([]);
  });

  it('a display is done when all its steps are answered', () => {
    const s = day(), st = storeById(s, 's2')!, d = displaysFor(st)[0];
    answerStep(s, st, 'br-022-display-awareness:d201:build', { done: true });
    expect(displayDone(st, d)).toBe(false);
    answerStep(s, st, 'br-022-display-awareness:d201:validate', { done: true });
    expect(displayDone(st, d)).toBe(true);
  });
});
