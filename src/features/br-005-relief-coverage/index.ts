import type { Feature } from '../../app/feature';
import { br005ReliefCoverageEngine } from './engine';
import { actions, panels } from './ui';

export const br005ReliefCoverage: Feature = { ...br005ReliefCoverageEngine, panels, actions };
