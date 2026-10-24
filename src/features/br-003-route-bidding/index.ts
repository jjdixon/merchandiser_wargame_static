import type { Feature } from '../../app/feature';
import { br003RouteBiddingEngine } from './engine';
import { actions, changes, panels } from './ui';

export const br003RouteBidding: Feature = { ...br003RouteBiddingEngine, panels, actions, changes };
