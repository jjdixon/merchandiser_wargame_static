import type { Feature } from '../../app/feature';
import { br027WorkforceVisibilityEngine } from './engine';
import { panels } from './ui';

export const br027WorkforceVisibility: Feature = { ...br027WorkforceVisibilityEngine, panels };
