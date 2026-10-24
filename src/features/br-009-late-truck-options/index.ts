import type { Feature } from '../../app/feature';
import { br009LateTruckOptionsEngine } from './engine';
import { actions, panels } from './ui';

export const br009LateTruckOptions: Feature = { ...br009LateTruckOptionsEngine, panels, actions };
