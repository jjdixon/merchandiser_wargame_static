# br-022-display-awareness

**Requirements:** BR-022 Display awareness and assignment (see docs/requirements.md)
**Status:** on by default. Since M5 it reads the core display model.

## What it does
Lists each store's displays (sold in, active, expired) and what's due today:
- phone: *Displays on your route today* (build / check / remove, by stop)
- Scheduler: *Displays today* (status, dates, done or due)

The displays come from the promotion feed (`br-036-promotion-feed`) through the core
display model (`src/engine/display.ts`). The visit steps for building, checking and
removing them are the display task workflow (`br-037-display-tasks`).

## Where things live
- `engine.ts`: `displaysFor`, `phaseOf` (pure, tested).
- `ui.ts`: phone and Scheduler lists.

## Decisions
- M5 moved the sample displays into promotions (BR-036) and the visit steps into
  BR-037. This folder is now only the "what's at my stores" view. See D-029.
