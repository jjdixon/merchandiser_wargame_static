# br-006-route-jumping

**Requirements:** BR-006 Workload optimization and route jumping (see docs/requirements.md)
**Status:** on by default. Covers T-405.

## What it does
- Finds **stops at risk**: projected past their done-by time, or uncovered.
- Recommends **who can help**: the route jumper first, then anyone idle who's
  qualified for that route type and under 40 hours, with the time they could get
  there.
- **Send help** (Supervisor → *Send help*) splits half of the remaining work to the
  helper (or covers an uncovered stop outright). The owner's day pulls in.
- The push-button "optimize the rest of the day" is the Scheduler's **Auto-assign**.

## Where things live
- `engine.ts`: risks, helpers, sendHelp (pure, tested). Uses the core `splitWork`.
- `ui.ts`: Supervisor panel.

## Decisions
- Recommendations are heuristics to argue with, not an optimizer (see D-003 for VROOM).
