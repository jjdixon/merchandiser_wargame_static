# nr-003-order-feedback

**Requirements:** NR-003 (see docs/requirements.md)
**Status:** on by default.

## What it does
MSLs own ordering. In the *Before you leave* phase the merchandiser answers two
required questions — **today's trays order** and **today's cases order**: Light,
About right or Heavy. Each shows the app's suggestion and why:

```
on hand  = delivered today + backstock found on arrival (NR-002)
need     = average daily sales × days until the next delivery (route type pattern)
Heavy    if on hand > need × (1 + tolerance), or leftover backstock > tolerance × need
Light    if on hand < need × (1 − tolerance), or out-of-stocks found and on hand < need
```

Tolerance is a setting (Pay & labor rules → Ordering, default 25%). Simulated
merchandisers take the suggestion. Anything not "About right" raises an alert to
the store's MSL and shows in **Order feedback for MSLs** on the Supervisor screen,
with "app said …" when the merchandiser overrode it and a this-week count.

Pull-ups (no truck) get no feedback steps.

## War-game check
- Do merchandisers trust the suggestion? How often do they override, and why?
- Is "light / about right / heavy" enough, or do MSLs need a quantity?
- Should sales vary by day of week, and should the look-ahead go past the next truck?

## Where things live
- `engine.ts` — suggestion, steps, MSL routing, week tally (pure, tested).
- `ui.ts` — the MSL inbox on Supervisor.
- `sales.json` — fictional average daily sales per store (trays, cases).

## Decisions
- Reads backstock from the core `store.backstock` and out-of-stocks from any
  out-of-stock entries step, so it never imports NR-002 or BR-020. See D-027.
