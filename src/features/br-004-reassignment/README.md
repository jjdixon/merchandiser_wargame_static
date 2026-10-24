# br-004-reassignment

**Requirements:** BR-004 Dynamic route and store reassignment (see docs/requirements.md)
**Status:** on by default. Covers T-402. Change logging and notifications for
published days are in `br-010-schedule-governance`.

## What it does
Scheduler → *Reassign or split*:
- **Reassign** a store: *Today only* (master owner unchanged, the default), *From
  tomorrow on* (changes the master owner in the week), or *Today and from now on*.
- **Split** half, a third or a quarter of a store's remaining work to a second person
  (a new stop at the same store).
- **Move route**: every open stop of one person to another, today only.
- Every action goes in a week-long history.

## Where things live
- `engine.ts`: reassign / moveRoute / split (pure, tested). Uses the core
  `week.master` (permanent owners) and `splitWork`.
- `ui.ts`: the Scheduler panel.

## Decisions
- The business said visit plans will be **hybrid** (route-based on regular days,
  flexible on down-days), so both store-level and route-level moves exist.
