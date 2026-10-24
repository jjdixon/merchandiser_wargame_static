import type { Feature } from '../../app/feature';
import { br017LoadAdjustmentsEngine } from './engine';
import { panels } from './ui';

export const br017LoadAdjustments: Feature = { ...br017LoadAdjustmentsEngine, panels };
