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
}

export interface Merchandiser {
  id: string;
  name: string;
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
  /** Task checklist state, keyed by task index. */
  tasks: Record<number, boolean>;
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
