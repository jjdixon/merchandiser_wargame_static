// Feature plug-in contract (screen side). See docs/architecture.md.
//
// A Feature = its pure engine part (EngineFeature, from src/engine) plus
// optional screen parts declared here. The app shell (src/main.ts) reads these
// from the registry in src/features/index.ts; core views only expose slots.
import type { EngineFeature, Setting, SimState } from '../engine';

/** Named places in the core views where features can add a panel. */
export type Slot =
  | 'sched.after'      // below the Scheduler view
  | 'merch.after'      // below the merchandiser phone
  | 'super.main'       // left column of the Supervisor view, after crew cards
  | 'super.aside'      // right column of the Supervisor view, after the map
  | 'rules.after';     // below the Pay & labor rules view

export interface FeatureSummary {
  id: string; title: string; description: string; requirements: string[];
  locked: boolean; on: boolean;
}

/** What every view render function receives. */
export interface ViewCtx {
  state: SimState;
  /** Merchandiser selected on the phone view. */
  selM: string;
  /** HTML of every enabled feature's panels for a slot, in order. */
  slot(name: Slot): string;
  /** All settings from enabled features (for the rules view). */
  settings: Setting[];
  /** Every registered feature and whether it's on (for the rules view). */
  catalog: FeatureSummary[];
}

/** Services the app shell offers to feature screen code. */
export interface AppApi {
  readonly state: SimState;
  readonly selM: string;
  /** Display name of the current view, e.g. "Supervisor". */
  readonly viewName: string;
  readonly scenarioLabel: string;
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
   * Runs once at startup. Only for locked features (it can't be undone when a
   * feature is switched off). Use for things outside the view, like a floating button.
   */
  mount?(app: AppApi): void;
}
