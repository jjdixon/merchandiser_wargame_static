# br-014-truck-visibility

**Requirements:** BR-014 Truck delivery visibility (see docs/requirements.md)
**Status:** on by default. Covers T-301.

## What it does
- **Delivery status per stop:** scheduled → en route (2 h out) → delivered, or
  **late** with the minutes, measured against the seed's scheduled truck time. So the
  *Late trucks* scenario shows as late, too.
- **Carrier delays:** by default 20% of trucks run 20–90 minutes late (repeatable per
  scenario). Dispatch reveals each delay about 45 minutes before the scheduled time,
  like an upstream late-truck feed. Set the share under *Pay & labor rules → Trucks*
  (0% = everyone on time).
- **Heads-up before leaving:** when the truck to a stop the merchandiser hasn't left
  for yet slips, they get a notice on the phone with the updated leave time, and the
  supervisor's alert feed logs it.

## War-game check
Phone: the *Trucks* card under **Next** shows each remaining stop's truck status and
the latest heads-ups. Supervisor: *Trucks today* table.

## Where things live
- `engine.ts`: status, carrier delays, notices (pure, tested). Uses the core
  `delayTruck` primitive. Scheduled times come from `src/data/stores.json`.
- `ui.ts`: phone card and Supervisor table.

## Decisions
- Delays are revealed ahead of time rather than all at 5 a.m., so the day keeps
  changing the way it does in the field.
- What to *do* about a late truck (wait / next store / swap) is a separate feature:
  `br-009-late-truck-options`.
