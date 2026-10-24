# br-017-load-adjustments

**Requirements:** BR-017 Order and load adjustment visibility (see docs/requirements.md)
**Status:** on by default. Covers T-303. Real feeds from the ordering and warehouse
systems are simulated.

## What it does
- After load validation, some orders get **cut** or **added to** (by default 15% of
  stores, mostly cuts, revealed about 90 minutes before the truck; repeatable).
- Each change reaches the merchandiser and the MSL (alert), and planned labor
  follows the new case count, including for a stop already in progress.
- Scheduler: *Ordered vs delivered* with fill rate and the last change per store.
- Phone: *Load changes on your route*.
- New curveball: **Load cut / add after validation** (cut 40% / 20%, add 15% / 30%).

## Where things live
- `engine.ts`: `adjustLoad`, warehouse changes, curveball (pure, tested).
- `ui.ts`: Scheduler table, phone list.

## Decisions
- "Ordered" is the case count the day started with (after scenario multipliers).
- The older *Heavier load* curveball (in `curveballs`) still exists; this one also
  tracks ordered vs delivered and handles cuts.
