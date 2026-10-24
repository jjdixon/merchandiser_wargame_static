# br-027-workforce-visibility

**Requirements:** BR-027 Scheduled vs. actual workforce visibility · on by default.

## What it does
Supervisor panel *Scheduled vs actual*, grouped into merchandisers, vacation relief
and route jumpers (all route types): where each person is now, stops done of total
(and of scheduled), stops added or taken away since the day started, first start vs
scheduled, work · wait · drive hours so far of planned, pull-ups and extra/second
visits, and a timeline with the **scheduled** stops (dashed) above what's **done**
(solid) and **still to do** (faded). Stores scheduled to someone but now uncovered
are listed underneath.

## Decisions
- "Scheduled" = the plan when the day was built (after vacations and call-outs in the
  scenario), snapshotted at day start.
- Extra/second visits are stops whose id isn't a seed store.
