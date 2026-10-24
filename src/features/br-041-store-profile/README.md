# br-041-store-profile

**Requirements:** BR-041 Store profile, notes and supporting context · on by default.

## What it does
- **Stores tab** (public, filtered to what the viewer may see). Store names on the
  Scheduler, phone and Supervisor screens link to it. It shows identifiers, banner,
  address, market and route type, who covers it today, brands, today's volume,
  contacts and constraints (all fictional, `profiles.json`), display compliance,
  backstock today, open display tasks, and this week's display history.
- **Notes:** category, author, visibility (everyone or leaders only), follow-up.
  Notes stay with the store across days and people. Search covers all stores.
  Merchandisers don't see leaders-only notes.
- Phone: *Store notes on your route* shows follow-ups and recent notes.

## Decisions
- Notes live in week state; *New week* starts from the seed notes again.
- Store links are a core feature (`ctx.storeLink`, `ViewDef.opensStore`), so any
  screen can link to the store page without importing this folder. See D-031.
