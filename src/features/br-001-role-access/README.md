# br-001-role-access

**Requirements:** BR-001 Role-based access and workforce roles (see docs/requirements.md)
**Status:** on by default. Covers T-103 (roles in the data) and T-104 (role picker).

## What it does
A **Viewing as** picker in the header. Each role sees only what it should:

| Role | Channel | Tabs | People & stores |
|---|---|---|---|
| Facilitator | — | everything | everything |
| LF Merchandiser Scheduler | portal | Scheduler, Supervisor, Week, Merchandiser | all |
| LF Merchandiser Manager | portal | Supervisor, Scheduler, Week | all |
| MSL — *market* | mobile | Supervisor, Week, Merchandiser | that market only |
| Merchandiser / Vacation relief / Route jumper | mobile | Merchandiser (own phone) | self, own stops |

The Findings tab is public — every role can log "this won't work because…".

## War-game check
Switch to a merchandiser and hand them the screen: they only see their own day.
Switch to an MSL: the supervisor view shrinks to their market, and coverage
suggestions only offer their own people.

## Where things live
- `roles.ts` — role list and `accessFor()` (pure, tested in `roles.test.ts`).
- `ui.ts` — header picker; remembers the role per browser.
- Roles, markets and route types of people and stores are core data
  (`src/data/merchandisers.json`, `stores.json`) because many features need them.
- Core views apply the scope through `ctx.scope` (see docs/architecture.md, *access*).

## Decisions
- This changes what's *shown*, not the simulation: everyone's day keeps running.
- Each browser runs its own simulated clock, so two phones aren't in sync yet
  (multiplayer clock is in the backlog, M6+).
- Admin isn't a separate role yet; the Facilitator sees everything.

## Open questions
- Which roles exist on day one? Can an MSL also act as scheduler?
