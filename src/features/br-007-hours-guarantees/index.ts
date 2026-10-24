import type { Feature } from '../../app/feature';
import { br007HoursGuaranteesEngine } from './engine';
import { changes, panels } from './ui';

export const br007HoursGuarantees: Feature = { ...br007HoursGuaranteesEngine, panels, changes };
