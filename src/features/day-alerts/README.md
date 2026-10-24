# day-alerts

**Requirements:** BR-007 (overtime warnings), BR-014 (truck waits), BR-026 (exceptions)
**Status:** on by default.

## What it does
On every clock step, raises one-time alerts for: a merchandiser waiting on a truck,
a stop passing its done-by time, projected weekly overtime, a merchandiser clocking
out, and product ready at a store nobody is assigned to. Shows the alert feed on the
Supervisor view (`super.aside` slot).

## Where things live
- `engine.ts` — `checkDay()`, the alert rules (pure, tested).
- `ui.ts` — the alert feed panel.
- `raise()` itself is core (`src/engine/sim.ts`); any feature can raise alerts.

## Decisions
- Switching this off stops the automatic alerts and hides the feed. Alerts raised
  by actions (curveballs, call-outs, merchandiser reports) still accumulate.
