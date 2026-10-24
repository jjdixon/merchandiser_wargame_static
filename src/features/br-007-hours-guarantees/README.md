# br-007-hours-guarantees

**Requirements:** BR-007 Hours, availability and overtime control (see docs/requirements.md)
**Status:** on by default. Covers T-403.

## What it does
- Each person has a **weekly guarantee** and **maximum** (by role in `limits.json`:
  merchandiser 32/40, relief 24/40, jumper 30/40; per-person overrides allowed).
- **Week → Hours this week:** guarantee, max, worked so far, planned week (today +
  projected future days), hours left to max, and a flag: over max / short of
  guarantee ("offer productive work") / within range.
- **Warnings** to the scheduler when someone is scheduled within 2 h of their max
  (adjustable), or past it.
- **At the maximum:** remaining stops are released for coverage (switch under
  *Pay & labor rules → Hours*), and the Supervisor's *Unfinished at max hours* panel
  asks **why** (truck late, store ran long, extra work, drive time, covering, other).

## Where things live
- `limits.json`: limits and reasons.
- `engine.ts`: limits, warnings, enforcement, reasons (pure, tested).
- `ui.ts`: Week panel (uses the core `projectDay` for future days) and Supervisor panel.

## Open questions
- Labor/union rules: guarantees, maximums, daily limits. Discovery session needed.
