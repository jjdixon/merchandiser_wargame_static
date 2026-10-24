import type { Feature } from '../../app/feature';
import { br006RouteJumpingEngine } from './engine';
import { actions, panels } from './ui';

export const br006RouteJumping: Feature = { ...br006RouteJumpingEngine, panels, actions };
