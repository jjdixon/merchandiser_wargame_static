# CLAUDE.md — Merch Day War Game

Read this first in every session. Keep it current: when you finish a task, update
**Status** below and add a line to `docs/decisions.md` if you made a choice someone
might later question.

**The one rule that matters most:** each requirement lives in its own folder under
`src/features/`. To change a requirement, change only its folder. If you can't,
stop and explain why before touching anything else. See `docs/architecture.md`.

## What this is

A static web prototype used to **war-game** a DSD (direct store delivery) company's
move from route/salaried merchandisers to **hourly merchandisers**. It is a
requirements-discovery tool, not the production system. End users are bad at writing
requirements but good at reacting to screens; every "that won't work because…" they
log is a requirement. Optimize for fast iteration and realistic behavior, not polish.

Roles modeled: **Scheduler** (builds the day), **Merchandiser** (phone view, works
stores), **Supervisor** (live coverage, alerts, cost). Plus **Pay & labor rules**
(switchable assumptions) and **Findings** (the captured feedback).

## Commands

```
npm install
npm run dev        # http://localhost:5173 with hot reload
npm test           # all tests (Vitest)
npm run test:one -- BR-009          # only tests for one requirement (or feature id)
npm run new-feature -- br-009-store-hours "Store hours" BR-009   # scaffold + register
npm run boundaries # architecture check (features can't import each other, etc.)
npm run check      # boundaries + typecheck + tests + build — run before every commit
npm run build      # static site in dist/ (base './', host anywhere)
```

## Architecture (keep these boundaries)

```
src/
  engine/        CORE, pure: types, plan (route/pay math), sim (clock, event
                 primitives, assignment), seed, week (days, pull-ups, roll-up),
                 visit (store visit steps), display (promotions → tasks → events),
                 feature (registry plumbing), time
  app/feature.ts the screen-side plug-in contract (Feature, ViewCtx, AppApi, slots)
  ui/            CORE VIEWS: scheduler, merchandiser, supervisor, week, rules, shared helpers
  data/          seed data as JSON (stores, merchandisers, rules, scenarios, lists)
  features/      one folder per requirement (or war-game tool) + index.ts registry
    pay-labor-rules/  settings for the Pay & labor rules screen (locked on)
    curveballs/       the header curveball bar's four disruptions
    day-alerts/       automatic alerts + the Supervisor alert feed
    findings/         "This won't work because…" button, Findings tab, storage
    br-024-work-standards/  per-store complexity classes (workMinutes hook)
    br-009-store-hours/     receiving + merch hours (readyAt hook, alerts)
    br-001-role-access/     "Viewing as" picker (access plug-in, header slot)
    br-012-planned-vs-actual/ engineered vs actual drift (onTick + fx state)
    br-002-guided-visit/    step-by-step visit, close-out, "play this merchandiser", Next card
    br-022-display-awareness/ store displays → visit steps
    br-020-oos-root-cause/  out-of-stock step, routed to cause owner
    br-039-photo-capture/   photo policy (adjustStep), photo records, simulated recognition
    br-014-truck-visibility/   truck status, carrier delays, heads-up before leaving
    br-009-late-truck-options/ wait / next store first / do it last, with effects
    br-017-load-adjustments/   load cuts/adds, ordered vs delivered
    br-028-messaging/          Messages tab, driver updates, simulated replies
    br-011-geofence-exceptions/ automatic entry/exit, exceptions review queue
    br-010-schedule-governance/ draft → published, change log, usual service time
    br-004-reassignment/       today-only vs permanent, move route, split
    br-007-hours-guarantees/   weekly guarantee/max, warnings, release at max + reason
    br-008-multi-visit-holiday/ planned second visits, holiday pattern (onDayStart)
    br-006-route-jumping/      at-risk stops, send help (jumper first)
    br-005-relief-coverage/    vacations, relief pool coverage (onDayStart)
    br-003-route-bidding/      open bid, eligible bids, award, publish to week.master
    nr-002-backstock/          backstock counts on arrival + leaving (totals or by category)
    nr-003-order-feedback/     light / about right / heavy to the MSL, with a suggestion
    br-036-promotion-feed/     promotions (seed or pasted sheet, versions) → display tasks
    br-037-display-tasks/      display setup / check / remove steps, reasons, escalation
    br-040-display-compliance/ Displays tab: lifecycle, compliance states, override
    br-041-store-profile/      Stores tab (store links everywhere), structured notes
    br-043-photo-review/       photo review queue, display compliance dashboard
    br-025-scorecards/         Scorecards tab + "your scorecard" on the phone, draft goals
    br-026-exceptions/         Exceptions tab: by type × day, drill-down, unfinished stops
    br-027-workforce-visibility/ Supervisor: scheduled vs actual for everyone
    br-013-timesheet-export/   Timesheets tab: approve / return / adjust, export preview
    br-030-first-run-tips/     a tip on each tab (view.top slot)
  main.ts        app shell: registry wiring, tabs, curveball bar, events, clock loop
tests/           core tests (engine + plug-in points). Feature tests live in each folder.
scripts/         check-boundaries.mjs, new-feature.mjs
docs/            requirements, architecture, backlog, decisions, domain model, pay rules
```

Rules:
- **New behavior goes in a feature folder**, not the core. Business logic goes in the
  feature's `engine.ts` (pure, tested); screen bits in its `ui.ts`.
- Features plug in through `readyAt`, `workMinutes`, `onTick`, `curveballs`,
  `settings`, `panels` (slots incl. `header`), `views` (tabs, `public`),
  `actions`/`changes`, `access` (viewer scope), `featureState` (day state),
  `weekState` (week state), `onDayStart`/`onDayEnd`, `projectDay`, visit steps
  (`visitSteps`, `adjustStep`, `onStepAnswered`). Table in
  `docs/architecture.md`. Need a new plug-in point? Add it to the core once, with a
  test in `tests/features.test.ts`, and say so in the PR.
- Features **never import each other**; only `main.ts` and `features/index.ts` import
  feature folders; `src/engine` and feature `engine.ts` files are pure.
  `npm run boundaries` enforces this.
- Name each feature's test `describe('<feature-id> [BR-0xx …]')` so
  `npm run test:one -- BR-0xx` finds it.
- New features start `defaultOn: false`. Turn on when they work.
- Core views filter people and stores with `ctx.scope` (set by the role feature);
  new core screens must do the same.
- Views return HTML strings. Core interactive elements use `data-act="…"` handled in
  `main.ts`; feature elements use `data-act="<feature-id>:<action>"` handled by that
  feature's `actions`.
- Always `esc()` any text that could come from data or users.
- Colors come from CSS tokens in `src/styles.css` (`:root` + dark overrides). No
  literal colors in components.
- Times are **minutes after midnight**; distances are **km on a flat grid**.

## Core engine model (the part to understand before changing anything)

- A merchandiser's day = ordered stops (`store.assign` + `store.seq`).
- `plan(state, m)` re-plans **open** stops every call, starting after the last
  **locked** stop. First stop: leave home to arrive when product is ready
  (`eta + buffer`), never before `rules.shiftStart`. Later stops: leave when the
  previous one ends. Nothing is ever planned in the past (`max(…, state.t)`).
- `tick()` advances the clock in ≤1-minute steps. When a planned departure falls in a
  step, the stop is **locked** (`store.lock`) with its planned times. History is then
  frozen; events and edits only change the future. Do not "simplify" tick into one
  jump — a test covers why.
- Work minutes = `fixed + trays × mpt + cases × mpc + extra` (NR-001), then each enabled feature's
  `workMinutes` hook. Ready time = `eta + buffer`, then each `readyAt` hook. Always
  call `workMin(state, s)` / `readyAt(state, s)`, never recompute. Wait = start −
  arrive (paid).
- Paid = work + wait + between-store drive (if `paidBetween`) + first drive (if
  `paidCommute`). Overtime is weekly: `merch.week` (hours before today) + today.
- Event primitives (`sim.ts`): `delayTruck` (only before work starts), `heavierLoad`,
  `addWork`, `callOut` (finish current stop, release the rest), `extraVisit`. The
  curveball menu that uses them is the `curveballs` feature.
- `tick()` runs every enabled feature's `onTick` after each step. Alerts are raised
  with `raise()`; the automatic ones are the `day-alerts` feature.
- `autoAssign` is a deliberately naive greedy pass. Real routing → VROOM (see D-003).
- **Week:** `buildDay(seed, week, scenario)` builds `week.day` from the seed (Thursday =
  every store) + `seed.week` patterns + `week.master` + hours so far; `endDay(state)`
  rolls it into `week.history`. Down-day stores have `pullUp: true` (no truck).
  `onDayStart` hooks may only *read* week state (the Week view projects future days).

## Status

- v0.8 (M6) — reporting and oversight: scorecards with draft goals (BR-025),
  exceptions report with drill-down (BR-026), scheduled vs actual for everyone
  (BR-027), timesheet approval and payroll/mileage export preview (BR-013),
  first-run tips (BR-030). Core: `view.top` slot, `ctx.view`. All planned
  milestones are built; next is war-gaming with the business.
- v0.7 (M5) — display tracking: core display model (promotions → store tasks →
  events), promotion feed with pasted spreadsheets (BR-036), display steps with
  reason codes and escalation (BR-037), lifecycle and compliance with override
  (BR-040), store page and notes linked from every screen (BR-041), photo review
  queue and compliance dashboard (BR-043). BR-022 now reads the model.
- v0.6.5 (M4.5) — added business context: trays and cases with separate labor
  minutes (NR-001, core), backstock counts at arrival and leaving (NR-002), light /
  heavy order feedback to the MSL (NR-003), ordering out-of-stocks to the MSL
  (BR-020). New core: `counts` step kind, `closeout` phase, `store.backstock`.
  Requirement ids may be `NR-0xx` (not in the workbook).
- v0.6 (M4) — week model (days, pull-ups, End day / New week, Week tab) plus
  schedule governance (BR-010), reassign/split (BR-004), hours guarantees (BR-007),
  second visits/holidays (BR-008), route jumping (BR-006), vacations/relief (BR-005),
  route bidding (BR-003). 156 tests. Finding: sample routes need ~50 h/week per
  person against a 40 h max (see backlog).
- v0.5.1 (merged #5) — practice visit: click through any store's visit in a sandbox copy of the
  day, no clock needed (in `br-002-guided-visit`). 121 tests.
- v0.5 (M3, merged #4) — day-of disruptions: truck visibility (BR-014), late-truck options
  (BR-009), load cuts/adds (BR-017), messaging (BR-028), geofence exceptions
  (BR-011). A Normal Thursday now has a few late trucks, load cuts and a geofence
  problem built in. 118 tests.
- v0.4 (M2, merged #3) — guided store visit (BR-002/015/021) with gated close-out and "play this
  merchandiser"; displays as visit steps (BR-022); out-of-stocks routed by cause
  (BR-020); photo policy, metadata and simulated recognition (BR-039). 93 tests.
- v0.3 (M1, merged #2) — per-store work standards (BR-024), store hours (BR-009), roles and
  the "Viewing as" picker (BR-001), planned vs actual with real-world drift (BR-012).
  Seed adds route types, markets, a vacation relief and a route jumper. 68 tests.
- v0.2 (M0) — feature architecture (merged #1).
- Requirements: `docs/requirements.md` (41 BRs). Build order: `docs/backlog.md`
  (all milestones built; triage war-game findings next).
- Findings are browser-local (localStorage); export via "Copy for backlog.md".
- Repo is **public** and auto-deploys to GitHub Pages on push to `main`
  (`.github/workflows/pages.yml`). **Never commit real store, employee or pay data
  while public** — see D-007.
- Not yet: real store data, breaks/meal periods, shared multiplayer clock, real
  routing.
- Next likely work: see top of `docs/backlog.md`.

## Working agreements for AI sessions

- One scoped task per session. Read the relevant files, make the change, add/adjust
  tests, run `npm run check`, commit with a clear message.
- **Changing a requirement:** find its folder in `docs/requirements.md` (*Where each
  requirement lives*), edit only that folder, run `npm run test:one -- BR-0xx`, then
  `npm run check`. Touching the core or another feature needs an explicit reason,
  stated to the user first.
- **Building a requirement:** `npm run new-feature`, fill in `engine.ts` + tests +
  `ui.ts` + README, update the requirement's status and folder in
  `docs/requirements.md`, tick it in `docs/backlog.md`.
- Each milestone is one branch and one pull request; don't merge to `main` without
  the user's review.
- Prefer editing seed JSON over code when the ask is "make the data look like X".
- Before adding any real data, check whether the repo is still public (D-007). If it
  is, stop and ask the user to make it private first.
- Pay rules are placeholders pending legal review — never present them as fact in UI
  copy. See `docs/pay-rules.md`.
- When a war-game finding is implemented, check it off in `docs/backlog.md` and note
  the commit.
