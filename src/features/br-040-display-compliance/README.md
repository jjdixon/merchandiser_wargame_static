# br-040-display-compliance

**Requirements:** BR-040 Display lifecycle, compliance and exceptions · on by default.

## What it does
**Displays tab:** one record per display from setup to removal: phase (planned, due,
overdue, up, expired, removed, not applicable), expected vs actual setup and removal
day, days up, photos, full history, and the compliance result: compliant, partially
compliant, non-compliant, absent, not applicable, unable to verify. Filter by result.
Managers can override any result; the override is logged with their role and
becomes the display's result everywhere.

Compliance rate = compliant ÷ (compliant + partial + non-compliant + absent).

## Decisions
- A display that started before the first simulated day is "carried in" as up and
  compliant, and gets checked on its first visit. See D-029.
