import type { Feature } from '../../app/feature';
import { br030FirstRunTipsEngine } from './engine';
import { actions, panels } from './ui';

export const br030FirstRunTips: Feature = { ...br030FirstRunTipsEngine, actions, panels };
