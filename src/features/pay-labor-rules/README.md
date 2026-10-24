# pay-labor-rules

**Requirements:** BR-007 (hours & overtime), BR-012 (time & mileage), BR-024 (work standards)
**Status:** locked on — the app depends on it.

## What it does
Declares the switchable assumptions on the *Pay & labor rules* screen: labor
standards (minutes per case, fixed minutes, receiving buffer), pay rules (paid drive
between stores, paid commute, overtime threshold, wage, mileage) and travel
(speed, road factor).

## Where things live
- The math is core: `src/engine/plan.ts` (`plan`, `summarize`, `totals`). It's core
  because every screen shows hours and cost.
- This folder only owns the settings list (`engine.ts`). Defaults are in
  `src/data/rules.json`.

## Decisions
- Values are placeholders pending legal review — see `docs/pay-rules.md`.
- Per-store standards (BR-024) will be a separate feature that adjusts labor
  minutes through the `workMinutes` hook, not a change here.
