import type { Feature } from '../../app/feature';
import { br002GuidedVisitEngine } from './engine';
import { actions, changes, panels } from './ui';

export const br002GuidedVisit: Feature = { ...br002GuidedVisitEngine, panels, changes, actions };
