# br-005-relief-coverage

**Requirements:** BR-005 Vacation and cross-model relief coverage (see docs/requirements.md)
**Status:** on by default. Covers T-406.

## What it does
- **Vacations** are booked per person per day (Week → *Vacations & relief*). Seeded:
  Dee off Friday, Marcus off Saturday.
- When a vacation day is built, that person is off and their stops go to the
  **relief pool** (people with the relief role), only where relief is qualified for
  the route type (LF / Traditional / Xpress), same market first. Anything left goes
  to *Needs coverage*.
- Relief with nothing assigned today shows under Supervisor → *Relief available*.
- *Pay & labor rules → Relief* can turn auto-coverage off.

## Where things live
- `vacations.json`: seeded bookings (`day`: 0 = Mon … 6 = Sun).
- `engine.ts`: bookings (week state), the `onDayStart` coverage (pure, tested).
- `ui.ts`: Week panel (book/cancel) and Supervisor panel.

## Open questions
- Can LF relief cover Xpress routes? How far ahead are vacations bid, and how does
  vacation bidding work?
