# br-036-promotion-feed

**Requirements:** BR-036 Promotion and display data feed (simulated) · on by default.

## What it does
- Loads promotions and display standards from `promotions.json` (fictional): name,
  brand, product group, display type, fixture, location, products, instructions,
  start/end day, how often to check it, and which stores (by id, banner, market,
  route type; none = all).
- **Promotions tab:** what's loaded, how many store tasks each made, a box to paste
  a spreadsheet (copied from Excel with a header row; *Copy template* gives one), and
  a version log. Pasting the same id with changes makes a new version.
- Every day (and right after a paste) it rebuilds the day's display tasks (core
  `state.displays.tasks`), one per promotion per matching store.

## War-game check
- Can the business fill in the template from what they have today?
- Which fields are really needed to tell a merchandiser what to build?
- What happens to a store's display when a promotion changes mid-flight?

## Where things live
- `engine.ts` — `promotions`, `loadTasks`, `parseSheet`, `loadPasted` (pure, tested).
- `ui.ts` — the Promotions tab.

## Decisions
- Pasted promotions last for the simulated week (they live in week state).
- Days are relative to Monday of the simulated week.
