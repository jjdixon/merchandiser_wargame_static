// BR-030 Training and in-app guidance: a first-run tip at the top of each tab,
// dismissed per tab (remembered in the browser by ui.ts). Tips live in tips.json.
import type { EngineFeature } from '../../engine';
import TIPS from './tips.json';

export const ID = 'br-030-first-run-tips';
export interface Tip { title: string; text: string }
export const tipFor = (view: string): Tip | null => (TIPS.tips as Record<string, Tip>)[view] ?? null;
export const tipViews = () => Object.keys(TIPS.tips);

export const br030FirstRunTipsEngine: EngineFeature = {
  id: ID,
  title: 'First-run tips',
  description: 'A short tip at the top of each tab the first time you open it; dismiss it or bring them all back.',
  requirements: ['BR-030'],
  defaultOn: true,
};
