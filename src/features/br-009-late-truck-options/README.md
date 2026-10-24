# br-009-late-truck-options

**Requirements:** BR-009 Store hours and delivery-aware start times, the "guide the
worker when a truck is late" part (see docs/requirements.md). Store hours themselves
are in `br-009-store-hours`.
**Status:** on by default. Covers T-302.

## What it does
When the merchandiser's **next** stop would mean waiting on the truck for 20+ minutes
(adjustable), they get a choice **before leaving**:

| Option | Effect |
|---|---|
| Wait for the truck | keep the order and take the paid wait |
| Go to the next store first | swap it with the following stop |
| Do this store last | move it to the end of the day |

Each option shows its finish time, paid waiting, late stops and paid hours, and the
best one (fewest late stops, then earliest finish) is marked. The same choice is
offered on the Supervisor view, so the room can argue about who should decide.
*Pay & labor rules → Late trucks* can make the best option apply automatically.

## Where things live
- `engine.ts`: `decisionFor`, `preview` (what-if without changing the plan),
  `choose` (pure, tested).
- `ui.ts`: phone card and Supervisor panel.

## Open questions
- BR-010 says merchandisers can't change their own schedules, but BR-009 asks to
  guide them to resequence. Who's allowed to pick: the merchandiser, the
  scheduler/MSL, or the system?
- Only the next stop is offered. A stop already arrived at stays as "wait".
