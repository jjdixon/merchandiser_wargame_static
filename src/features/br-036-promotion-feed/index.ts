import type { Feature } from '../../app/feature';
import { br036PromotionFeedEngine } from './engine';
import { actions, promotionsView } from './ui';

export const br036PromotionFeed: Feature = { ...br036PromotionFeedEngine, actions, views: [promotionsView] };
