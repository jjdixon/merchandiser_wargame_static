# Pay & labor rules

**Status: every value here is a placeholder for war-gaming. None has been reviewed by
employment counsel.** Wage-and-hour treatment of travel and waiting time varies by
state and by fact pattern. Confirm each rule for every state we operate in before
it informs a real pay policy or system.

| Rule | Default | Meaning | Review status |
|---|---|---|---|
| `paidBetween` | true | Drive time between stores is paid | ⏳ Needs counsel |
| `paidCommute` | false | Home → first store drive is paid | ⏳ Needs counsel |
| Paid waiting | always on | On-site time waiting for the truck is paid | ⏳ Needs counsel |
| `ot` | 40 | Weekly hours before overtime (1.5×) | ⏳ Confirm; some states add daily OT |
| `wage` | $17/hr | Single rate for the model | Placeholder |
| `mileage` | $0.70/mi | Reimbursed miles only (between stores, plus commute if paid) | Placeholder — set to company policy |
| `mpc` | 0.8 min/case | Labor standard per case | Needs time study |
| `fixed` | 15 min | Fixed time per visit | Needs time study |
| `buffer` | 10 min | Receiving check-in after truck arrives | Varies by chain — consider per-store |

## Not modeled yet (likely needed)

- Meal and rest breaks (state-specific; some states require them).
- Daily overtime and seventh-day rules (some states).
- Minimum shift / reporting-time pay when a shift is cut short.
- Split shifts.
- Different wage rates by person or role.
- Per-chain or per-store labor standards and receiving windows.

When one of these gets implemented, add it to `Rules` in `src/engine/types.ts`, give
it a default in `src/data/rules.json`, a control in `src/ui/rules.ts`, a test, and a
row in this table.
