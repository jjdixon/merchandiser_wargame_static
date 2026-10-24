# curveballs

**Requirements:** BR-004 (reassignment), BR-008 (extra visits), BR-014 (late trucks), BR-017 (load changes)
**Status:** on by default; switch off to hide the curveball bar.

## What it does
The four disruptions in the header's *Throw a curveball* bar: truck late (with a
delay choice), heavier load, merchandiser call-out, store requests an extra visit.
Each raises an alert describing what happened.

## Where things live
- `engine.ts` — the curveball definitions (pure).
- The underlying state changes are core primitives in `src/engine/sim.ts`
  (`delayTruck`, `heavierLoad`, `callOut`, `extraVisit`), because merchandiser
  actions use them too.
- The header bar is drawn by `src/main.ts` from `state.ext.curveballs`.

## Adding a curveball from another feature
Declare `curveballs: [...]` in that feature's engine part. It appears in the bar
automatically when the feature is on. Don't add it here.
