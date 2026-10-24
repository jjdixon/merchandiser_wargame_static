// Core domain types. All times are minutes after midnight on the simulated day.
// All distances are kilometres on a flat grid (x, y); the map is a stand-in for
// real lat/long until real store data is loaded.

export type Minutes = number;
export type Point = [number, number];

export interface Rules {
  /** Earliest anyone may leave home (minutes after midnight). */
  shiftStart: Minutes;
  /** Minutes after the truck arrives before product is workable (receiving check-in). */
  buffer: Minutes;
  /** Labor standard: minutes per case worked. */
  mpc: number;
  /** Fixed minutes per visit (check-in, backroom, photos, paperwork). */
  fixed: Minutes;
  /** Average drive speed, km/h. */
  speed: number;
  /** Straight-line to road distance multiplier. */
  road: number;
  /** Is drive time between stores paid? */
  paidBetween: boolean;
  /** Is the drive from home to the first store paid? */
  paidCommute: boolean;
  /** Weekly overtime threshold, hours. */
  ot: number;
  /** Hourly wage, dollars. */
  wage: number;
  /** Mileage reimbursement, dollars per mile (reimbursed miles only). */
  mileage: number;
  /**
   * Settings owned by feature folders, keyed by setting key. Defaults come from
   * each feature's `ruleDefaults`. Read/write with getRule/setRule.
   */
  feature: Record<string, number | boolean>;
}

/** Route types (BR-005). Stores and relief qualifications use these. */
export type RouteType = 'LF' | 'Traditional' | 'Xpress';
/**
 * Field roles that work stores (BR-001). Office roles (scheduler, manager, MSL)
 * are viewers, not simulated workers — see the role-access feature.
 */
export type MerchRole = 'merchandiser' | 'relief' | 'jumper';

export interface Merchandiser {
  id: string;
  name: string;
  role: MerchRole;
  /** Market (MSL area) this person belongs to. */
  market: string;
  /** Route types this person is qualified to work. */
  routeTypes: RouteType[];
  home: Point;
  /** Paid hours already worked earlier this week. */
  week: number;
  out: boolean;
}

/** A frozen leg of a merchandiser's day. Created when they depart for a stop. */
export interface Lock {
  merch: string;
  depart: Minutes;
  arrive: Minutes;
  start: Minutes;
  end: Minutes;
  drive: Minutes;
  km: number;
  wait: Minutes;
  work: Minutes;
  first: boolean;
}

export interface Store {
  id: string;
  name: string;
  routeType: RouteType;
  market: string;
  xy: Point;
  cases: number;
  /** Truck arrival time. */
  eta: Minutes;
  /** Store wants merchandising done by this time. */
  win: Minutes;
  assign: string | null;
  /** Route order within the assigned merchandiser's day (open stops only). */
  seq: number;
  /** Extra minutes added during the day (running long, etc.). */
  extra: Minutes;
  lock: Lock | null;
  /** Answers to today's visit steps, keyed by step id (see VisitStep). */
  answers: Record<string, StepAnswer>;
}

export type Severity = 'bad' | 'warn' | 'info';
export interface Alert { t: Minutes; sev: Severity; text: string }

export interface SimState {
  t: Minutes;
  scenario: string;
  rules: Rules;
  merch: Merchandiser[];
  stores: Store[];
  alerts: Alert[];
  /** Keys of one-time alerts already raised. */
  fired: Record<string, true>;
  /** Counter for generated ids (extra visits). */
  nextId: number;
  /** Hooks contributed by enabled features. Rebuilt by enableFeatures(). */
  ext: Extensions;
  /** Ids of enabled features, in registry order. */
  enabled: string[];
  /**
   * Day-scoped state owned by features, keyed by feature id. Reset by newDay().
   * Read/write through featureState() so each feature only sees its own slot.
   */
  fx: Record<string, unknown>;
}

export interface Stop {
  s: Store;
  depart: Minutes;
  arrive: Minutes;
  start: Minutes;
  end: Minutes;
  drive: Minutes;
  km: number;
  wait: Minutes;
  work: Minutes;
  first: boolean;
  locked: boolean;
}

export interface DayPlan {
  m: Merchandiser;
  stops: Stop[];
  work: Minutes;
  wait: Minutes;
  /** Drive minutes between stores. */
  dB: Minutes;
  /** Drive minutes home → first store. */
  dF: Minutes;
  kB: number;
  kF: number;
  /** Paid minutes today under the current rules. */
  paid: Minutes;
  cases: number;
  /** Projected paid hours for the week including today. */
  weekProj: number;
  /** Regular and overtime hours today. */
  reg: number;
  oth: number;
  /** Reimbursed miles today. */
  miles: number;
  late: Stop[];
  clockIn: Minutes | null;
  clockOut: Minutes | null;
  labor: number;
  mileage: number;
}

export type StatusKind = 'off' | 'drive' | 'wait' | 'work' | 'idle' | 'done' | 'out';
export interface Status {
  k: StatusKind;
  label: string;
  stop?: Stop;
  pct?: number;
  pos?: Point;
}

/* ---------- feature plug-in contract (engine side) ----------
 * A feature is one requirement's behavior, living in src/features/<id>/.
 * The core calls these plug-in points; it never knows which features exist.
 * Everything here is pure: no DOM, no storage. Screen-side parts of a feature
 * (panels, tabs, click actions) are declared in src/app/feature.ts.
 */

/** Adjusts a value the core computed for a store. Receives the previous value in the chain. */
export type StoreHook = (state: SimState, s: Store, base: Minutes) => Minutes;

export interface Option { value: string; label: string }

/** A disruption the facilitator can inject from the header bar. */
export interface Curveball {
  id: string;
  label: string;
  /** What it can be applied to right now (stores, merchandisers…). */
  targets(state: SimState): Option[];
  /** Extra choices shown next to the target (e.g. how late). */
  params?: Array<{ id: string; label: string; options: Option[]; default: string }>;
  /** Apply it. Should raise its own alert describing what happened. */
  apply(state: SimState, target: string, params: Record<string, string>): void;
}

/** A switchable assumption shown on the Pay & labor rules screen. */
export interface Setting {
  /** A core Rules key (e.g. "mpc") or a feature-owned key stored in rules.feature. */
  key: string;
  label: string;
  help: string;
  type: 'number' | 'boolean';
  step?: number;
  /** Groups settings into panels on the rules screen. */
  section: string;
}

export interface EngineFeature {
  /** Folder name, e.g. "br-009-store-hours". */
  id: string;
  title: string;
  /** One sentence shown next to its on/off switch. */
  description: string;
  /** BR IDs this feature implements (traceability). */
  requirements: string[];
  defaultOn: boolean;
  /** Can't be switched off (the app depends on it). */
  locked?: boolean;
  /** Adjust when product at a store is ready to work (default: truck ETA + buffer). */
  readyAt?: StoreHook;
  /** Adjust the labor minutes for a visit (default: fixed + cases × mpc + extra). */
  workMinutes?: StoreHook;
  /** Runs after every clock step (≤1 min). Use for alerts and time-driven changes. */
  onTick?: (state: SimState) => void;
  curveballs?: Curveball[];
  settings?: Setting[];
  /** Defaults for feature-owned settings (merged into rules.feature). */
  ruleDefaults?: Record<string, number | boolean>;
  /** Steps this feature adds to a store visit (BR-002 guided visit). */
  visitSteps?: (state: SimState, s: Store) => VisitStep[];
  /** Adjust any feature's step before it's shown (e.g. require a photo). */
  adjustStep?: (state: SimState, s: Store, step: VisitStep) => VisitStep;
  /** Called after any step is answered (by a person or the simulation). */
  onStepAnswered?: (state: SimState, s: Store, step: VisitStep, answer: StepAnswer) => void;
}

/* ---------- store visit steps (core contract for the guided visit) ----------
 * Any feature can add steps to a visit; the guided-visit feature shows them in
 * phase order and gates close-out on the required ones. Answers live on the
 * store (store.answers) so every feature can read them.
 */
export type VisitPhase = 'backstock' | 'display' | 'aisle' | 'validate' | 'oos';
export const PHASE_ORDER: VisitPhase[] = ['backstock', 'display', 'aisle', 'validate', 'oos'];

/**
 * check: tick it off · count: enter a number · choice: pick one option ·
 * entries: add rows of choices (e.g. out-of-stock product + cause) or confirm none.
 */
export type StepKind = 'check' | 'count' | 'choice' | 'entries';

export interface EntryField { id: string; label: string; options: string[] }

export interface VisitStep {
  /** Unique per store visit. Convention: "<feature id>:<local id>". */
  id: string;
  /** Feature that owns the step. */
  featureId: string;
  phase: VisitPhase;
  /** Order within the phase (lower first). */
  order?: number;
  title: string;
  detail?: string;
  kind: StepKind;
  required: boolean;
  /** Photo needed before the step counts as done. */
  photo?: 'required' | 'optional';
  /** For 'choice'. */
  options?: string[];
  /** For 'entries'. */
  fields?: EntryField[];
  /** For 'count': unit label, e.g. "cases". */
  unit?: string;
  /** Only once work has started (product is available); else also while waiting on the truck. */
  needsProduct?: boolean;
  /**
   * How a simulated (not human-played) merchandiser answers this step. Default:
   * tick it / count 0 / first option / no entries.
   */
  autoAnswer?: (state: SimState, s: Store) => Omit<StepAnswer, 'at'>;
}

export interface PhotoRef {
  /** Display name, e.g. file name. */
  name: string;
  /** Sim time it was taken. */
  at: Minutes;
  /** Browser-only preview URL (object URL); absent for simulated photos. */
  url?: string;
  simulated?: boolean;
}

export interface StepAnswer {
  /** Sim time answered. */
  at: Minutes;
  /** Filled in by the simulation rather than a person. */
  auto?: boolean;
  done?: boolean;
  count?: number;
  choice?: string;
  entries?: Array<Record<string, string>>;
  photo?: PhotoRef;
}

export interface Extensions {
  readyAt: StoreHook[];
  workMinutes: StoreHook[];
  onTick: Array<(state: SimState) => void>;
  curveballs: Curveball[];
  settings: Setting[];
  visitSteps: Array<NonNullable<EngineFeature['visitSteps']>>;
  adjustStep: Array<NonNullable<EngineFeature['adjustStep']>>;
  onStepAnswered: Array<NonNullable<EngineFeature['onStepAnswered']>>;
}
