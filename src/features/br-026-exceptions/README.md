# br-026-exceptions

**Requirements:** BR-026 Exception-based reporting · on by default.

## What it does
**Exceptions tab:** every warning and problem from the week by type × day (geofence,
delivery, load changes, overtime/hours, incomplete or uncovered work, visits running
long, displays, out-of-stocks, order feedback, schedule changes). Click a count to
drill down; filter by person or store; store names open the store page. When a day
ends, stops that were never finished are added as *Incomplete* exceptions.

## How it works
Alerts are typed by their text (`types.json`, first match wins) and tied to the
person and store they name, so no other feature had to change. Plain news (info
alerts like clock-outs) isn't counted.

## Decisions
- Typing by text is a prototype shortcut; a real system would carry a type on each
  event. See D-035.
