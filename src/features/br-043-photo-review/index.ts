import type { Feature } from '../../app/feature';
import { br043PhotoReviewEngine } from './engine';
import { actions, changes, photoReviewView } from './ui';

export const br043PhotoReview: Feature = { ...br043PhotoReviewEngine, actions, changes, views: [photoReviewView] };
