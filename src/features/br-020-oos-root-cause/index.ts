import type { Feature } from '../../app/feature';
import { br020OosRootCauseEngine } from './engine';
import { panels } from './ui';

export const br020OosRootCause: Feature = { ...br020OosRootCauseEngine, panels };
