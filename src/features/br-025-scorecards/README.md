# br-025-scorecards

**Requirements:** BR-025 KPI scorecard and coaching · on by default.

## What it does
- **Scorecards tab:** one row per person, today or week to date, against goals:
  on-time stops (finished by the store's done-by time), route completion, units per
  work hour, required visit steps done, displays compliant; plus out-of-stocks found,
  exceptions, paid hours, overtime and miles. A team row and the goal row make it a
  manager comparison.
- **Phone:** *Your scorecard today* shows the person their own results vs goals.
- Goals are settings under *Scorecard goals (draft)*: the KPI definitions still need
  business approval. Sales isn't simulated, so it's left out.

## Where things live
- `engine.ts` — `card`, `kpis`, `meets`, week history (pure, tested). `ui.ts` — tab + phone panel.
