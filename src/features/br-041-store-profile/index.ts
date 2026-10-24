import type { Feature } from '../../app/feature';
import { br041StoreProfileEngine } from './engine';
import { actions, changes, panels, storeView } from './ui';

export const br041StoreProfile: Feature = { ...br041StoreProfileEngine, actions, changes, panels, views: [storeView] };
