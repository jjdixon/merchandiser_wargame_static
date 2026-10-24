import type { Feature } from '../../app/feature';
import { br011GeofenceExceptionsEngine } from './engine';
import { actions, panels } from './ui';

export const br011GeofenceExceptions: Feature = { ...br011GeofenceExceptionsEngine, panels, actions };
