import type { Feature } from '../../app/feature';
import { br040DisplayComplianceEngine } from './engine';
import { changes, displaysView } from './ui';

export const br040DisplayCompliance: Feature = { ...br040DisplayComplianceEngine, changes, views: [displaysView] };
