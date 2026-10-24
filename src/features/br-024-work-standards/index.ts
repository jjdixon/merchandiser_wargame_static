import type { Feature } from '../../app/feature';
import { br024WorkStandardsEngine } from './engine';
import { changes, panels } from './ui';

export const br024WorkStandards: Feature = { ...br024WorkStandardsEngine, panels, changes };
