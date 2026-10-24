import type { Feature } from '../../app/feature';
import { dayAlertsEngine } from './engine';
import { alertsPanel } from './ui';

export const dayAlerts: Feature = { ...dayAlertsEngine, panels: [alertsPanel] };
