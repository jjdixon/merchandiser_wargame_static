import type { Feature } from '../../app/feature';
import { br013TimesheetExportEngine } from './engine';
import { actions, changes, timesheetsView } from './ui';

export const br013TimesheetExport: Feature = { ...br013TimesheetExportEngine, actions, changes, views: [timesheetsView] };
