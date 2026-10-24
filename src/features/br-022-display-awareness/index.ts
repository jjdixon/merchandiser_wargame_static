import type { Feature } from '../../app/feature';
import { br022DisplayAwarenessEngine } from './engine';
import { panels } from './ui';

export const br022DisplayAwareness: Feature = { ...br022DisplayAwarenessEngine, panels };
