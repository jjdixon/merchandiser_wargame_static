// Feature registry: the one list of every feature folder.
// Order matters only when two features adjust the same value (hooks run in order).
// `npm run new-feature` adds entries between the marker comments automatically.
import type { Feature } from '../app/feature';
import { payLaborRules } from './pay-labor-rules';
import { curveballs } from './curveballs';
import { dayAlerts } from './day-alerts';
import { findings } from './findings';
import { br024WorkStandards } from './br-024-work-standards';
import { br009StoreHours } from './br-009-store-hours';
import { br001RoleAccess } from './br-001-role-access';
import { br012PlannedVsActual } from './br-012-planned-vs-actual';
// <feature-imports>

export const FEATURES: Feature[] = [
  payLaborRules,
  curveballs,
  dayAlerts,
  findings,
  br024WorkStandards,
  br009StoreHours,
  br001RoleAccess,
  br012PlannedVsActual,
  // <feature-list>
];
