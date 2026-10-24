# br-013-timesheet-export

**Requirements:** BR-013 Payroll and expense integration (simulated) · on by default.

## What it does
**Timesheets tab** (managers): one sheet per person per day with employee id, clock
in/out, paid hours split regular / overtime on the week, miles and mileage $, and the
day's exceptions worth checking (geofence, overtime, hour limits). A sheet is
*still working* until clock-out, then *to approve*. Approve, **return** (reason
required) or **adjust** minutes ± (reason required, e.g. a geofence gap you rejected
— BR-011 records those but doesn't change pay itself). *Approve N with nothing to
check* clears the clean ones. Approved sheets make the **payroll and mileage export
preview** (CSV, copyable). Nothing is sent anywhere.

## Decisions
- Employee ids are fictional (`employees.json`). Pay rules are placeholders pending
  legal review. See D-036.
