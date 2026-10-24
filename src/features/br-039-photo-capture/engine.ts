// BR-039 Photo capture, geolocation and (simulated) image recognition.
// - Sets which visit steps need a photo (an open business question, so it's two
//   switches on Pay & labor rules).
// - Every photo is recorded with store, step, merchandiser, time and location.
// - A simulated recognition suggestion (product group, display type, compliance,
//   confidence) is attached for a person to confirm or correct. Real recognition
//   needs proof of accuracy first; SKU-level recognition isn't required initially.
import {
  featureState, hash01, ruleBool,
  type EngineFeature, type Point, type SimState, type Store, type VisitStep,
} from '../../engine';

export const ID = 'br-039-photo-capture';
const DISPLAY = 'br039.requireDisplayPhotos', VALIDATE = 'br039.requireValidatePhoto';

export type Compliance = 'compliant' | 'partially compliant' | 'non-compliant';
export interface Suggestion { productGroup: string; displayType: string; compliance: Compliance; confidence: number }
export interface PhotoRecord {
  storeId: string; storeName: string; stepId: string; stepTitle: string; merchId: string | null;
  at: number; location: Point; simulated: boolean; url?: string; name: string;
  suggestion: Suggestion; review?: 'confirmed' | 'corrected';
}
export const photos = (state: SimState) => featureState<PhotoRecord[]>(state, ID, () => []);

/** Photo policy applied to every feature's steps. */
export function adjustStep(state: SimState, _s: Store, step: VisitStep): VisitStep {
  if (step.phase === 'display' && step.photo)
    return { ...step, photo: ruleBool(state.rules, DISPLAY, true) ? 'required' : 'optional' };
  if (step.phase === 'validate')
    return { ...step, photo: ruleBool(state.rules, VALIDATE, false) ? 'required' : 'optional' };
  return step;
}

const GROUPS = ['Sandwich bread', 'Buns & rolls', 'Snack cakes', 'English muffins', 'Specialty bread'];
const TYPES = ['Endcap', 'Floor stand', 'Shipper', 'Pallet', 'Shelf set', 'Clip strip'];

/** Repeatable stand-in for image recognition. Uses the step text when it can. */
export function suggest(key: string, stepText: string): Suggestion {
  const t = stepText.toLowerCase();
  const productGroup = /bun|roll/.test(t) ? 'Buns & rolls' : /snack/.test(t) ? 'Snack cakes' : /muffin/.test(t) ? 'English muffins'
    : /bread|sandwich|wheat/.test(t) ? 'Sandwich bread' : GROUPS[Math.floor(hash01(key + 'g') * GROUPS.length)];
  const displayType = TYPES.find(x => t.includes(x.toLowerCase())) ?? (/pallet/.test(t) ? 'Pallet' : /shipper/.test(t) ? 'Shipper' : /stand|tower/.test(t) ? 'Floor stand' : /strip/.test(t) ? 'Clip strip' : /aisle|set|shelf/.test(t) ? 'Shelf set' : 'Endcap');
  const u = hash01(key + 'c');
  const compliance: Compliance = u < 0.7 ? 'compliant' : u < 0.9 ? 'partially compliant' : 'non-compliant';
  return { productGroup, displayType, compliance, confidence: Math.round(60 + hash01(key + 'p') * 35) };
}

export function review(state: SimState, index: number, result: 'confirmed' | 'corrected'): void {
  const p = photos(state)[index];
  if (p) p.review = result;
}

export const br039PhotoCaptureEngine: EngineFeature = {
  id: ID,
  title: 'Photo capture',
  description: 'Which steps need a photo, photo metadata (store, step, person, time, location), and a simulated recognition suggestion to confirm.',
  requirements: ['BR-039'],
  defaultOn: true,
  ruleDefaults: { [DISPLAY]: true, [VALIDATE]: false },
  settings: [
    { key: DISPLAY, label: 'Require photos on display steps', help: 'Off = photo optional on display steps', type: 'boolean', section: 'Photos' },
    { key: VALIDATE, label: 'Require a photo to validate the set', help: 'Shelf photo after working the aisles', type: 'boolean', section: 'Photos' },
  ],
  adjustStep,
  onStepAnswered(state, s, step, answer) {
    if (!answer.photo) return;
    const list = photos(state);
    if (list.some(p => p.storeId === s.id && p.stepId === step.id && p.at === answer.photo!.at && p.name === answer.photo!.name)) return;
    // A retake replaces the earlier photo for that step.
    const i = list.findIndex(p => p.storeId === s.id && p.stepId === step.id);
    const rec: PhotoRecord = {
      storeId: s.id, storeName: s.name, stepId: step.id, stepTitle: step.title, merchId: s.assign,
      at: answer.photo.at, location: s.xy, simulated: !!answer.photo.simulated, url: answer.photo.url, name: answer.photo.name,
      suggestion: suggest(`${state.scenario}|${s.id}|${step.id}`, `${step.title} ${step.detail ?? ''}`),
    };
    if (i >= 0) list[i] = rec; else list.push(rec);
  },
};
