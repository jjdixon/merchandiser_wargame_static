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
import { br010ScheduleGovernance } from './br-010-schedule-governance';
import { br004Reassignment } from './br-004-reassignment';
import { br007HoursGuarantees } from './br-007-hours-guarantees';
import { br008MultiVisitHoliday } from './br-008-multi-visit-holiday';
import { br006RouteJumping } from './br-006-route-jumping';
import { br005ReliefCoverage } from './br-005-relief-coverage';
import { br003RouteBidding } from './br-003-route-bidding';
import { nr002Backstock } from './nr-002-backstock';
import { nr003OrderFeedback } from './nr-003-order-feedback';
import { br036PromotionFeed } from './br-036-promotion-feed';
import { br037DisplayTasks } from './br-037-display-tasks';
import { br040DisplayCompliance } from './br-040-display-compliance';
import { br041StoreProfile } from './br-041-store-profile';
import { br043PhotoReview } from './br-043-photo-review';
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
  br010ScheduleGovernance,
  br004Reassignment,
  br007HoursGuarantees,
  br008MultiVisitHoliday,
  br006RouteJumping,
  br005ReliefCoverage,
  br003RouteBidding,
  nr002Backstock,
  nr003OrderFeedback,
  br036PromotionFeed,
  br037DisplayTasks,
  br040DisplayCompliance,
  br041StoreProfile,
  br043PhotoReview,
  // <feature-list>
];
