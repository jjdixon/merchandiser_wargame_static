import type { Feature } from '../../app/feature';
import { br010ScheduleGovernanceEngine } from './engine';
import { actions, panels } from './ui';

export const br010ScheduleGovernance: Feature = { ...br010ScheduleGovernanceEngine, panels, actions };
