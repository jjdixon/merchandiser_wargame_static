import { describe, expect, it } from 'vitest';
import { answerStep, newDay, setRule, storeById, visitSteps, type EngineFeature } from '../../engine';
import { seed } from '../../data';
import { br039PhotoCaptureEngine, photos, review, suggest } from './engine';

// Stand-in steps so this test doesn't depend on other feature folders.
const steps: EngineFeature = {
  id: 'test-steps', title: 't', description: 't', requirements: [], defaultOn: true,
  visitSteps: () => [
    { id: 't:display', featureId: 't', phase: 'display', title: 'Build display: BBQ buns pallet', kind: 'check', required: true, photo: 'optional' },
    { id: 't:validate', featureId: 't', phase: 'validate', title: 'Validate the set', kind: 'check', required: true },
    { id: 't:aisle', featureId: 't', phase: 'aisle', title: 'Work aisle', kind: 'check', required: true },
  ],
};
const day = () => newDay(seed, 'normal', { features: [steps, br039PhotoCaptureEngine] });
const photoOf = (s: ReturnType<typeof day>, id: string) => visitSteps(s, storeById(s, 's1')!).find(x => x.id === id)!.photo;

describe('br-039-photo-capture [BR-039]', () => {
  it('display steps require a photo by default; validate is optional; aisles have none', () => {
    const s = day();
    expect(photoOf(s, 't:display')).toBe('required');
    expect(photoOf(s, 't:validate')).toBe('optional');
    expect(photoOf(s, 't:aisle')).toBeUndefined();
  });

  it('the two switches change the photo policy', () => {
    const s = day();
    setRule(s.rules, 'br039.requireDisplayPhotos', false);
    setRule(s.rules, 'br039.requireValidatePhoto', true);
    expect(photoOf(s, 't:display')).toBe('optional');
    expect(photoOf(s, 't:validate')).toBe('required');
  });

  it('records a photo with store, step, person, time and location, plus a suggestion', () => {
    const s = day(), st = storeById(s, 's1')!;
    answerStep(s, st, 't:display', { done: true, photo: { name: 'pallet.jpg', at: s.t } });
    const [p] = photos(s);
    expect(p).toMatchObject({ storeId: 's1', stepId: 't:display', merchId: 'ana', location: st.xy, simulated: false });
    expect(p.suggestion).toMatchObject({ productGroup: 'Buns & rolls', displayType: 'Pallet' });
  });

  it('a retake replaces the photo for that step; review results are kept', () => {
    const s = day(), st = storeById(s, 's1')!;
    answerStep(s, st, 't:display', { photo: { name: 'a.jpg', at: s.t } });
    answerStep(s, st, 't:display', { photo: { name: 'b.jpg', at: s.t + 1 } });
    expect(photos(s)).toHaveLength(1);
    expect(photos(s)[0].name).toBe('b.jpg');
    review(s, 0, 'corrected');
    expect(photos(s)[0].review).toBe('corrected');
  });

  it('suggestions are repeatable', () => {
    expect(suggest('k', 'Snack cake tower')).toEqual(suggest('k', 'Snack cake tower'));
    expect(suggest('k', 'Snack cake tower')).toMatchObject({ productGroup: 'Snack cakes', displayType: 'Floor stand' });
  });
});
