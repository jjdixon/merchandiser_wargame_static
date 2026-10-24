# br-037-display-tasks

**Requirements:** BR-037 Store-level display task assignment and workflow · on by default.

## What it does
Every display task due at a store today becomes steps in the visit's Displays phase:

| Due | Steps | Answers → result |
|---|---|---|
| setup | Build display → Validate built (photo) | Built + matches / partly / doesn't match → compliant / partial / non-compliant; Not built + reason → absent; Not applicable |
| check (every N visit days) | Check display (photo) | in place / fixed today → compliant; partly → partial; not there + reason → absent; couldn't check → unable to verify |
| remove (after the end day) | Remove expired | removed → compliant; not removed + reason → non-compliant |

- Standard reason codes are in `reasons.json`.
- Results are recorded as core display events (with the photo and its simulated
  recognition) for BR-040, BR-041 and BR-043.
- Absent or non-compliant raises an alert for the MSL. A setup still not done is
  flagged "N days late" on the step and escalates to the MSL at day start once it is
  late by the *Escalate a late setup after* setting.
- Tasks follow the store: whoever works the store today gets them (reassigning the
  store moves them too).
- *Simulated displays done to standard* is a war-game dial for simulated players.

## War-game check
- Are the reason codes the right ones? Which ones are really "the store's fault"?
- How late can a setup be before the MSL must act?
- How long do display steps add to a visit?

## Decisions
- Build-then-validate stays two steps (business feedback from M2). See D-030.
