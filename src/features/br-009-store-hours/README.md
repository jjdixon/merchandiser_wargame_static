# br-009-store-hours

**Requirements:** BR-009 Store hours and delivery-aware start times (see docs/requirements.md)
**Status:** on by default. The late-truck decision prompt (wait / next store / swap) is T-302 in M3.

## What it does
Each store has **receiving (invoicing) hours** and **merchandising hours**. Work can
start only once the truck is in (plus the receiving buffer), receiving is open, and
merchandising is allowed. Start times move with all three.

Alerts:
- a truck lands after receiving closes (bad, when the truck is due)
- planned work runs past merchandising hours (warning, an hour before close)

Seeded hours: Hometown Grocer's truck arrives 6:30 but receiving opens at 7:00, so
Dee now waits until 7:00 — a built-in conversation starter.

## War-game check
Scheduler → *Store hours* panel: edit any store's times and watch the timeline move.
Phone view shows the hours for each stop on the merchandiser's route. *Pay & labor
rules → Store hours* can switch off "wait for receiving to open" to compare.

## Where things live
- `hours.json` — hours by chain (store-name prefix), with optional per-store overrides.
- `engine.ts` — `readyAt` hook, `conflicts()`, alerts (pure, tested).
- `ui.ts` — Scheduler table (editable) and phone list.
- Hours are stored as feature settings (`br009.<field>.<storeId>`, minutes).

## Decisions
- One hours window per store per day. Day-of-week hours come with the week model (M4).
- Extra visits have no hours on file and aren't constrained.
