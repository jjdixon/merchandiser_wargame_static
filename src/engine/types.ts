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
  /** Labor standard: minutes per tray worked (NR-001). */
  mpt: number;
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
  /** Down-day pull-up visit: no truck today; work from backstock (week model). */
  pullUp: boolean;
  market: string;
  xy: Point;
  /** Trays delivered today (NR-001). */
  trays: number;
  /** Cases delivered today. */
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
  /**
   * Backstock counted in the backroom today (NR-002): at arrival and when leaving.
   * Written by the backstock feature; read by others (e.g. order feedback, NR-003).
   */
  backstock?: { start?: Units; end?: Units };
}

/** A volume of product in both units the business handles (NR-001). */
export interface Units { trays: number; cases: number }

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
  /** Day of the week, 0 = Mon … 6 = Sun. The seed describes Thursday (3). */
  day: number;
  /** The week this day belongs to (shared across days; see engine/week.ts). */
  week: WeekState;
  /**
   * Display tracking (engine/display.ts): today's display tasks (from promotions)
   * and today's display events. Events roll into week.displayEvents at endDay.
   */
  displays: { tasks: DisplayTask[]; events: DisplayEvent[] };
}

/* ---------- display tracking (core; see engine/display.ts) ---------- */
/** A promotion or display standard (BR-036). Store selectors are ANDed; none = all stores. */
export interface Promotion {
  id: string;
  /** Bumped when the same promotion is loaded again with changes. */
  version: number;
  name: string;
  brand: string;
  productGroup: string;
  displayType: string;
  fixture: string;
  location: string;
  products: string[];
  instructions: string;
  /** First and last day (0 = Mon of the simulated week). */
  start: number;
  end: number;
  /** Check it every N visit days after setup (1 = every visit). */
  checkEvery: number;
  delivery?: string;
  stores?: string[];
  banners?: string[];
  markets?: string[];
  routeTypes?: RouteType[];
}
/** One promotion at one store. */
export interface DisplayTask extends Omit<Promotion, 'id' | 'stores' | 'banners' | 'markets' | 'routeTypes'> {
  /** "<promotion id>@<store id>". */
  id: string;
  promoId: string;
  storeId: string;
}
export type DisplayAction = 'setup' | 'check' | 'remove';
/** Compliance states (BR-040). */
export type DisplayResult = 'compliant' | 'partially compliant' | 'non-compliant' | 'absent' | 'not applicable' | 'unable to verify';
export interface DisplayEvent {
  taskId: string;
  storeId: string;
  day: number;
  t: Minutes;
  action: DisplayAction | 'review';
  result: DisplayResult;
  /** Absence or other reason code. */
  reason?: string;
  /** Who recorded it (merchandiser name, or the reviewer). */
  by: string;
  photo?: PhotoRef;
  auto?: boolean;
  note?: string;
}

/** One finished day, as rolled up by endDay(). */
export interface DayRecord {
  day: number;
  scenario: string;
  merch: Record<string, { paid: Minutes; stops: number; cases: number; trays: number }>;
}

/**
 * The week around the simulated day. Survives from day to day; each day is a fresh
 * SimState built from the seed, the weekly patterns and this.
 */
export interface WeekState {
  /** Today, 0 = Mon … 6 = Sun. */
  day: number;
  /** Paid hours each person had before the first simulated day of this week. */
  startHours: Record<string, number>;
  /** Finished days, in order. */
  history: DayRecord[];
  /** Permanent store owner (overrides the seed's assignedTo from the next day on). */
  master: Record<string, string | null>;
  /** Week-scoped state owned by features (see weekState()). */
  fx: Record<string, unknown>;
  /** Display events from finished days (engine/display.ts). */
  displayEvents?: DisplayEvent[];
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
  trays: number;
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
  /** Adjust the labor minutes for a visit (default: fixed + trays × mpt + cases × mpc + extra). */
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
  /**
   * Runs when a day is built, before the clock starts: adjust which stores are
   * visited, who's out, volumes. Read week state here; don't write to it (the Week
   * view builds future days to project them).
   */
  onDayStart?: (state: SimState) => void;
  /** Runs when the facilitator ends the day, before it's rolled up. Write week state here. */
  onDayEnd?: (state: SimState) => void;
}

/* ---------- store visit steps (core contract for the guided visit) ----------
 * Any feature can add steps to a visit; the guided-visit feature shows them in
 * phase order and gates close-out on the required ones. Answers live on the
 * store (store.answers) so every feature can read them.
 */
export type VisitPhase = 'backstock' | 'display' | 'aisle' | 'validate' | 'oos' | 'closeout';
export const PHASE_ORDER: VisitPhase[] = ['backstock', 'display', 'aisle', 'validate', 'oos', 'closeout'];

/**
 * check: tick it off · count: enter a number · choice: pick one option ·
 * entries: add rows of choices (e.g. out-of-stock product + cause) or confirm none ·
 * counts: several numbers at once (e.g. trays and cases), every one required.
 */
export type StepKind = 'check' | 'count' | 'choice' | 'entries' | 'counts';

export interface EntryField { id: string; label: string; options: string[] }
export interface CountField { id: string; label: string }

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
  /** For 'counts'. */
  countFields?: CountField[];
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
  /** Simulated image recognition, attached by the photo feature (BR-039). */
  recognition?: { productGroup: string; displayType: string; compliance: DisplayResult; confidence: number };
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
  /** For 'counts': field id → number. */
  counts?: Record<string, number>;
  photo?: PhotoRef;
}

export interface Extensions {
  readyAt: StoreHook[];
  workMinutes: StoreHook[];
  onTick: Array<(state: SimState) => void>;
  curveballs: Curveball[];
  settings: Setting[];
  visitSteps: Array<NonNullable<EngineFeature['visitSteps']>>;
  onDayStart: Array<(state: SimState) => void>;
  onDayEnd: Array<(state: SimState) => void>;
  adjustStep: Array<NonNullable<EngineFeature['adjustStep']>>;
  onStepAnswered: Array<NonNullable<EngineFeature['onStepAnswered']>>;
}
