import type { Feature } from '../../app/feature';
import { br014TruckVisibilityEngine } from './engine';
import { panels } from './ui';

export const br014TruckVisibility: Feature = { ...br014TruckVisibilityEngine, panels };
