import type { Feature } from '../../app/feature';
import { br009StoreHoursEngine } from './engine';
import { changes, panels } from './ui';

export const br009StoreHours: Feature = { ...br009StoreHoursEngine, panels, changes };
