# br-003-route-bidding

**Requirements:** BR-003 Digital route bidding and scheduling (see docs/requirements.md)
**Status:** on by default. Covers T-407.

## What it does
Week → *Route bidding*:
1. **Open a bid** on a run (a person's regular stores, with their route types and
   market).
2. **Bids:** only people qualified for every route type on the run are eligible.
   They bid on the phone (*Open bids you can bid on*), the facilitator ticks them, or
   *Simulate bids* fills some in (repeatable).
3. **Close & award:** by seniority (hire date, `seniority.json`) by default, or same
   market first then seniority (*Pay & labor rules → Bidding*). The reason is shown.
4. **Publish:** the winner becomes the run's permanent owner from tomorrow (core
   `week.master`).

## Where things live
- `seniority.json`: hire dates (sample).
- `engine.ts`: runs, eligibility, bids, award, publish (week state, pure, tested).
- `ui.ts`: Week panel and phone bid card.

## Open questions
- What decides an award (seniority, qualification, hours)? How often do bids happen?
  Which rules are union-governed? Vacation bidding uses the same mechanics?
