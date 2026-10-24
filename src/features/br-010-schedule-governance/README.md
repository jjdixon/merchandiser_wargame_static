# br-010-schedule-governance

**Requirements:** BR-010 Schedule governance, BR-004 (change history and notifications)
**Status:** on by default. Covers T-401.

## What it does
- Each day's schedule is a **Draft** until published. Rework it freely.
- **Publish** (Scheduler panel, or automatically at shift start, which is the default)
  freezes who works each store and the planned start.
- After publishing, every **reassignment** and every **start moved by more than 30
  min** is logged with time, from and to. The people affected are notified via the
  alert feed.
- Each store's **usual service time** is learned across the week (average start on
  earlier days). A change that moves a store more than an hour away from it is
  flagged *off usual time* (customer consistency).
- Merchandisers still can't change their own schedule; only the Scheduler view has
  edit controls.

## Where things live
- `engine.ts`: snapshot, diffing, usual times (week state, pure, tested).
- `ui.ts`: Scheduler banner with Publish, plus the week's change log.

## Open questions
- Who can publish (scheduler only, or MSL too)? What notice period do union rules
  require for a published change?
