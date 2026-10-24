# nr-002-backstock

**Requirements:** NR-002 (see docs/requirements.md)
**Status:** on by default.

## What it does
Two required steps in every store visit:
- **Count backstock on arrival** (first step): what's already in the backroom.
- **Count backstock before you leave** (last phase, *Before you leave*): what's still
  there once the shelves are full.

The count is **totals** (trays, cases) or **by category** (Bread, Buns & rolls,
Snack cakes, Specialty; see `categories.json`). The switch is *Count backstock by
category* under Pay & labor rules → Store visit. Either way the totals land on the
core `store.backstock` so other features (order feedback, NR-003) can use them.

Supervisor gets a **Backstock** panel: arrival vs leaving by store, the change, and
leaving counts from earlier days this week.

## War-game check
- Is counting at arrival *and* departure realistic for every stop, or only some?
- Totals vs by category: time both with real merchandisers. What does the MSL need?
- Who acts on growing backstock — the MSL, the scheduler, the order system?

## Where things live
- `engine.ts` — steps, simulated counts, roll-up to totals, week history (pure, tested).
- `ui.ts` — Supervisor panel.
- `categories.json` — the category list (generic).

## Decisions
- Simulated counts are repeatable per store and day. Pull-ups find more backstock
  (they work from it).
- Week history is written at *End day*, never during the day, so practice visits
  (which share the week) can't leak into it. See D-026.
