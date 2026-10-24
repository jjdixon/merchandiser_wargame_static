import type { Feature } from '../../app/feature';
import { nr002BackstockEngine } from './engine';
import { panels } from './ui';

export const nr002Backstock: Feature = { ...nr002BackstockEngine, panels };
