# br-024-work-standards

**Requirements:** BR-024 Engineered work standards and capacity (see docs/requirements.md)
**Status:** on by default.

## What it does
Labor time is set per store instead of one universal rate. Every store has a
complexity class:

| Class | Per-case time | Fixed time | Seeded stores |
|---|---|---|---|
| Simple | 85% of global | 70% of global | Corner Stop, Dollar Daily |
| Standard | 100% | 100% | everything else |
| Complex | 120% | 160% | the three ValuMarts |

The global minutes-per-case and fixed minutes still come from *Pay & labor rules*;
the class percentages are editable there too (section *Store work standards*).

## War-game check
On the Scheduler, the *Work standards by store* panel lets you change a store's
class. The timeline, hours and cost update immediately, so the room can argue about
which stores really are harder. Cases per hour is shown per store.

## Where things live
- `standards.json` — classes, default percentages, which store is which class.
- `engine.ts` — the `workMinutes` hook, `storeClass`, `casesPerHour` (pure, tested).
- `ui.ts` — Scheduler panel and the class selector.
- Per-store class is stored as a feature setting (`br024.class.<storeId>`), so it
  survives switching scenarios like other rule edits.

## Decisions
- Classes scale the global standard rather than replacing it, so one edit to minutes
  per case still moves everything.
- A stop already departed for keeps its planned labor (core locking rule).

## Open questions (from the business)
- Is the numerator units or cases? How is store complexity defined, and who sets it?
