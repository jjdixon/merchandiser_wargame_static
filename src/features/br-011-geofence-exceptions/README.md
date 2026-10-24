# br-011-geofence-exceptions

**Requirements:** BR-011 Automatic store presence and geofence exceptions (see docs/requirements.md)
**Status:** on by default. Covers T-305.

## What it does
- Store **entry and exit are recorded automatically** at arrival and departure. There's
  no manual check-in.
- A share of visits (10% by default, repeatable) have a problem: **missing entry**,
  **missing exit**, or **late entry** (GPS drift). Each becomes an exception with the
  paid minutes that depend on it.
- Supervisor: *Geofence exceptions* queue with **Accept planned** / **Reject**.
- Phone: *Check-in record* shows in/out times and whether anything is under review.
- New curveball: **Phone misses a geofence event** (entry if not arrived yet, else exit).

## Where things live
- `engine.ts`: presence events, problems, review decisions, curveball (pure, tested).
- `ui.ts`: Supervisor queue, phone record.

## Decisions
- Rejecting is recorded but doesn't change today's paid hours yet; the timesheet
  approval and payroll export (BR-013, M6) will use these decisions.

## Open questions
- Privacy, consent and device-location policy; union review.
- What should happen to rejected minutes: unpaid until corrected, or paid pending review?
