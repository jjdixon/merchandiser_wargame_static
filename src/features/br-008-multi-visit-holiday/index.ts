import type { Feature } from '../../app/feature';
import { br008MultiVisitHolidayEngine } from './engine';
import { panels } from './ui';

export const br008MultiVisitHoliday: Feature = { ...br008MultiVisitHolidayEngine, panels };
