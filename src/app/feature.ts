// Feature plug-in contract (screen side). See docs/architecture.md.
//
// A Feature = its pure engine part (EngineFeature, from src/engine) plus
// optional screen parts declared here. The app shell (src/main.ts) reads these
// from the registry in src/features/index.ts; core views only expose slots.
import type { EngineFeature, Merchandiser, Setting, SimState, Store } from '../engine';

/** Named places in the core views where features can add a panel. */
export type Slot =
  | 'header'           // header bar, right of the title (keep it small)
  | 'sched.after'      // below the Scheduler view
  | 'merch.top'        // top of the phone screen (e.g. "next action")
  | 'merch.visit'      // inside the current-stop card (the store visit workflow)
  | 'merch.after'      // below the merchandiser phone
  | 'super.main'       // left column of the Supervisor view, after crew cards
  | 'super.aside'      // right column of the Supervisor view, after the map
  | 'rules.after'      // below the Pay & labor rules view
  | 'week.after';      // below the Week view

export interface FeatureSummary {
  id: string; title: string; description: string; requirements: string[];
  locked: boolean; on: boolean;
}

/**
 * What the current viewer may see (BR-001). Null fields mean "no limit".
 * Provided by a feature's `access` plug-in; core views apply it.
 */
export interface Access {
  /** Tab ids this viewer may open. Public tabs are always allowed. */
  views?: string[];
  /** People this viewer may see. */
  merch?: (m: Merchandiser) => boolean;
  /** Stores this viewer may see. */
  store?: (s: Store) => boolean;
  /** Phone view is locked to this person. */
  lockMerch?: string;
  /** Short description shown to the viewer, e.g. "MSL · North market". */
  label?: string;
}

/** Access with every filter filled in (no limit = allow all). */
export interface Scope {
  merch: (m: Merchandiser) => boolean;
  store: (s: Store) => boolean;
  lockMerch: string | null;
  label: string | null;
}

/** What every view render function receives. */
export interface ViewCtx {
  /** Who is looking and what they may see. Core views filter by this. */
  scope: Scope;
  state: SimState;
  /** Merchandiser selected on the phone view. */
  selM: string;
  /** HTML of every enabled feature's panels for a slot, in order. */
  slot(name: Slot): string;
  /** All settings from enabled features (for the rules view). */
  settings: Setting[];
  /**
   * Another day of this week as currently planned (no clock, nothing changes).
   * Past days come from week.history; use this for today's start or future days.
   */
  projectDay(day: number): SimState;
  /** Every registered feature and whether it's on (for the rules view). */
  catalog: FeatureSummary[];
  /** Store chosen for the store page (BR-041), if any. */
  selStore: string | null;
  /**
   * A store's name as a link to the store page when a feature provides one
   * (a view with opensStore); otherwise just the escaped name.
   */
  storeLink(s: { id: string; name: string }): string;
}

/** Services the app shell offers to feature screen code. */
export interface AppApi {
  readonly state: SimState;
  readonly selM: string;
  /** Display name of the current view, e.g. "Supervisor". */
  readonly viewName: string;
  readonly scenarioLabel: string;
  /** Who is viewing, from the access plug-in (e.g. "MSL · North market · mobile"); null = facilitator. */
  readonly viewer: string | null;
  /** The same projection the Week view uses (see ViewCtx.projectDay). */
  projectDay(day: number): SimState;
  /** Store chosen for the store page, if any. */
  readonly selStore: string | null;
  /** Open the store page for this store (if a feature provides one). */
  openStore(id: string): void;
  /** Re-render now (after changing state). */
  refresh(): void;
  toast(message: string): void;
  copy(text: string, okMessage: string): Promise<void>;
}

export interface Panel {
  slot: Slot;
  /** Lower renders first. Default 100. */
  order?: number;
  render(ctx: ViewCtx): string;
}

/** A whole tab contributed by a feature. */
export interface ViewDef {
  id: string;
  label: string;
  /** Small text after the label, e.g. a count. */
  badge?(): string;
  /** Visible to every role (e.g. the Findings log). */
  public?: boolean;
  /** This is the store page: store links open it with ctx.selStore set. */
  opensStore?: boolean;
  render(ctx: ViewCtx): string;
}

export interface Feature extends EngineFeature {
  panels?: Panel[];
  views?: ViewDef[];
  /**
   * Click handlers. Trigger with data-act="<feature id>:<name>" on any element
   * inside the view; the element is passed in so you can read its data-* attributes.
   */
  actions?: Record<string, (app: AppApi, el: HTMLElement) => void>;
  /**
   * Change handlers (inputs, selects). Trigger with data-fchange="<feature id>:<name>".
   */
  changes?: Record<string, (app: AppApi, el: HTMLInputElement) => void>;
  /**
   * Limits what the current viewer sees (role-based access, BR-001). If several
   * enabled features return access, the first non-null one wins.
   */
  access?(app: AppApi): Access | null;
  /**
   * Runs once at startup. Only for locked features (it can't be undone when a
   * feature is switched off). Use for things outside the view, like a floating button.
   */
  mount?(app: AppApi): void;
}
