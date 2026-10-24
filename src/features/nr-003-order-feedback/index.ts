import type { Feature } from '../../app/feature';
import { nr003OrderFeedbackEngine } from './engine';
import { panels } from './ui';

export const nr003OrderFeedback: Feature = { ...nr003OrderFeedbackEngine, panels };
