// Feature registry: the one list of every feature folder.
// Order matters only when two features adjust the same value (hooks run in order).
// `npm run new-feature` adds entries between the marker comments automatically.
import type { Feature } from '../app/feature';
import { payLaborRules } from './pay-labor-rules';
import { curveballs } from './curveballs';
import { dayAlerts } from './day-alerts';
import { findings } from './findings';
// <feature-imports>

export const FEATURES: Feature[] = [
  payLaborRules,
  curveballs,
  dayAlerts,
  findings,
  // <feature-list>
];
