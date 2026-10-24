import type { Feature } from '../../app/feature';
import { br012PlannedVsActualEngine } from './engine';
import { panels } from './ui';

export const br012PlannedVsActual: Feature = { ...br012PlannedVsActualEngine, panels };
