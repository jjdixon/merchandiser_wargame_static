import type { Feature } from '../../app/feature';
import { br004ReassignmentEngine } from './engine';
import { actions, panels } from './ui';

export const br004Reassignment: Feature = { ...br004ReassignmentEngine, panels, actions };
