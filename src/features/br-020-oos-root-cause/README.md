# br-020-oos-root-cause

**Requirements:** BR-020 Out-of-stock and void root-cause capture (see docs/requirements.md)
**Status:** on by default. Covers T-203.

## What it does
The last phase of every visit is **Out-of-stocks**: add each one (product + cause)
or tap *None found*. Each report is routed to the role that owns the cause:

| Cause | Routed to |
|---|---|
| Order fill: shorted at the warehouse | Order management |
| Delivery: missed or late | Transportation |
| Ordering: order too low | Ordering team |
| Inventory: in the backroom, not worked | MSL |
| Merchandising: not filled last visit | MSL |
| Other / not sure | MSL |

The routed alert stands in for "trigger a workflow in the inventory and ordering
app". The Supervisor view lists today's out-of-stocks with counts by owner.
Simulated merchandisers report one at about a quarter of stores (repeatable).

## Where things live
- `oos.json`: products and the cause → owner map. Edit to match the business's list.
- `engine.ts`: the step, routing, records (pure, tested).
- `ui.ts`: Supervisor panel.

## Open questions
- Automatic detection and "notify before projected stockout" need data discovery
  (not modeled).
- Is the cause list right, and who really owns each?
