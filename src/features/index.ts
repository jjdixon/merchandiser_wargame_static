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
import { br002GuidedVisit } from './br-002-guided-visit';
import { br022DisplayAwareness } from './br-022-display-awareness';
import { br020OosRootCause } from './br-020-oos-root-cause';
import { br039PhotoCapture } from './br-039-photo-capture';
import { br014TruckVisibility } from './br-014-truck-visibility';
import { br009LateTruckOptions } from './br-009-late-truck-options';
import { br017LoadAdjustments } from './br-017-load-adjustments';
import { br028Messaging } from './br-028-messaging';
import { br011GeofenceExceptions } from './br-011-geofence-exceptions';
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
  br002GuidedVisit,
  br022DisplayAwareness,
  br020OosRootCause,
  br039PhotoCapture,
  br014TruckVisibility,
  br009LateTruckOptions,
  br017LoadAdjustments,
  br028Messaging,
  br011GeofenceExceptions,
  // <feature-list>
];
