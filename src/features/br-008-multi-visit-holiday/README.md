# br-008-multi-visit-holiday

**Requirements:** BR-008 Holiday and multiple-visit scheduling (see docs/requirements.md)
**Status:** on by default (no holiday set). Covers T-404.

## What it does
- **Planned second visits** (`patterns.json`): merchandising-only visits later in the
  day, on set days, often by a different person. Seed: ValuMart #1042 and #1180 on
  Fri/Sat (relief Rosa and jumper Sam), ValuMart #1107 on Thursday (store owner).
- **Holiday pattern:** set *Pay & labor rules → Holidays* to a day (0 = Mon … 6 = Sun).
  That day has no deliveries (light pull-ups only); the day before builds up ×1.3;
  the day after catches up ×1.5. It applies when each day is built (Reset day or
  End day), and the Week view's projections pick it up straight away.

## Where things live
- `patterns.json`: second visits and holiday factors.
- `engine.ts`: the core `onDayStart` plug-in (pure, tested).
- `ui.ts`: Scheduler panel (today) and Week panel (pattern).

## Open questions
- Real holiday calendars by customer and region; which stores need second visits.
