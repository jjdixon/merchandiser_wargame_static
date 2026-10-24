# br-022-display-awareness

**Requirements:** BR-022 Display awareness and assignment (see docs/requirements.md)
**Status:** on by default. Covers T-202. The full Display Tracking module is M5.

## What it does
Each store's sold-in, active and expired displays (fixture, location, products,
delivery method, timing) become steps in the guided visit's **Displays** phase:

| Action | Steps |
|---|---|
| build | Build display → Validate built (photo optional) |
| maintain | Check & refill (photo optional) |
| remove | Remove expired |

Displays are also listed on the phone (*Displays on your route today*) and the
Scheduler (*Displays today*, with done/to-do).

## Where things live
- `displays.json`: displays by store id (sample data).
- `engine.ts`: `displaySteps` (the core `visitSteps` plug-in), `displayDone` (pure, tested).
- `ui.ts`: phone and Scheduler lists.

## Decisions
- "Build then validate" are two steps, per the business feedback.
- Photo requirements are set by `br-039-photo-capture`, not here.
