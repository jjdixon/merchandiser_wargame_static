// BR-022 Display awareness and assignment.
// Each store's sold-in and active displays (fixture, products, timing, delivery
// method, required action) become steps in the guided visit:
//   build    → "Build" then "Validate built" (the business asked for build-then-validate)
//   maintain → "Check & refill"
//   remove   → "Remove expired"
// The full Display Tracking module (promotion feed, lifecycle, compliance) is M5;
// this is the merchandiser's view of what's due today.
import type { EngineFeature, SimState, Store, VisitStep } from '../../engine';
import DATA from './displays.json';

export const ID = 'br-022-display-awareness';

export interface Display {
  id: string; name: string; fixture: string; location: string; products: string[];
  status: 'sold-in' | 'active' | 'expired'; action: 'build' | 'maintain' | 'remove';
  delivery: string; until: string;
}

export function displaysFor(s: Store): Display[] {
  return ((DATA as Record<string, Display[]>)[s.id] ?? []);
}

export const stepIds = (d: Display) =>
  d.action === 'build' ? [`${ID}:${d.id}:build`, `${ID}:${d.id}:validate`] : [`${ID}:${d.id}:${d.action}`];

export function displaySteps(_state: SimState, s: Store): VisitStep[] {
  return displaysFor(s).flatMap((d, i): VisitStep[] => {
    const base = { featureId: ID, phase: 'display' as const, kind: 'check' as const, required: true, needsProduct: true };
    const where = `${d.fixture} · ${d.location} · ${d.products.join(', ')}`;
    if (d.action === 'build') return [
      { ...base, id: `${ID}:${d.id}:build`, order: i * 10, title: `Build display: ${d.name}`, detail: `${where}. ${d.delivery}.` },
      { ...base, id: `${ID}:${d.id}:validate`, order: i * 10 + 1, title: `Validate built: ${d.name}`, detail: 'Full, signed, priced, in the sold-in location.', photo: 'optional' },
    ];
    if (d.action === 'remove') return [{ ...base, id: `${ID}:${d.id}:remove`, order: i * 10, title: `Remove expired: ${d.name}`, detail: `${where}. Ended ${d.until.replace(/^ended /, '')}.` }];
    return [{ ...base, id: `${ID}:${d.id}:maintain`, order: i * 10, title: `Check & refill: ${d.name}`, detail: `${where}. Runs until ${d.until}.`, photo: 'optional' }];
  });
}

/** Display is done today when all of its steps are answered. */
export const displayDone = (s: Store, d: Display) => stepIds(d).every(id => s.answers[id]?.done);

export const br022DisplayAwarenessEngine: EngineFeature = {
  id: ID,
  title: 'Display awareness',
  description: 'Each store\'s sold-in and active displays (build / maintain / remove) show up as visit steps and on the route.',
  requirements: ['BR-022'],
  defaultOn: true,
  visitSteps: displaySteps,
};
