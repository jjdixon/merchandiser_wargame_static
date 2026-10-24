# br-012-planned-vs-actual

**Requirements:** BR-012 Time and mileage capture — engineered vs actual (see docs/requirements.md)
**Status:** on by default.

## What it does
Real days don't run to the standard. When a merchandiser leaves for a stop, the
engineered drive and work times are recorded; then the **actual drive** (on
departure) and **actual work** (when work starts) drift by a repeatable amount. The
rest of that person's day re-plans from the actuals, so slip compounds the way it
does in the field.

Drift is skewed toward running over: with the default 15% variation, a stop runs
roughly 10% fast to 20% slow. It's repeatable — the same scenario gives the same
day every run, so a war game can be replayed.

## War-game check
Scheduler → *Planned vs actual*: per stop, engineered vs actual drive and work
minutes, planned start (start-of-day plan) vs actual start, and finish vs plan.
Each person's header shows engineered vs actual hours. *Pay & labor rules →
Planned vs actual → Real-world variation* sets the spread (0% = exact).

## Where things live
- `engine.ts` — `onTick` drift, baseline capture, `comparison()` (pure, tested).
- `ui.ts` — Scheduler panel.
- Day state (baseline, engineered times) lives in `state.fx['br-012-planned-vs-actual']`.
- Uses the core primitives `adjustDrive` / `adjustWork` (added in M1).

## Decisions
- Drift changes the *locked* stop, so it's history: switching the feature off later
  keeps what already happened.
- Mileage actuals follow drive minutes; separate GPS mileage comes with geofencing (M3).
