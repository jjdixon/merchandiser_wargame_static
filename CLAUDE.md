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
                 primitives, assignment), seed, feature (registry plumbing), time
  app/feature.ts the screen-side plug-in contract (Feature, ViewCtx, AppApi, slots)
  ui/            CORE VIEWS: scheduler, merchandiser, supervisor, rules, shared helpers
  data/          seed data as JSON (stores, merchandisers, rules, scenarios, lists)
  features/      one folder per requirement (or war-game tool) + index.ts registry
    pay-labor-rules/  settings for the Pay & labor rules screen (locked on)
    curveballs/       the header curveball bar's four disruptions
    day-alerts/       automatic alerts + the Supervisor alert feed
    findings/         "This won't work because…" button, Findings tab, storage
  main.ts        app shell: registry wiring, tabs, curveball bar, events, clock loop
tests/           core tests (engine + plug-in points). Feature tests live in each folder.
scripts/         check-boundaries.mjs, new-feature.mjs
docs/            requirements, architecture, backlog, decisions, domain model, pay rules
```

Rules:
- **New behavior goes in a feature folder**, not the core. Business logic goes in the
  feature's `engine.ts` (pure, tested); screen bits in its `ui.ts`.
- Features plug in through `readyAt`, `workMinutes`, `onTick`, `curveballs`,
  `settings`, `panels` (slots), `views` (tabs), `actions`/`changes`. Table in
  `docs/architecture.md`. Need a new plug-in point? Add it to the core once, with a
  test in `tests/features.test.ts`, and say so in the PR.
- Features **never import each other**; only `main.ts` and `features/index.ts` import
  feature folders; `src/engine` and feature `engine.ts` files are pure.
  `npm run boundaries` enforces this.
- Name each feature's test `describe('<feature-id> [BR-0xx …]')` so
  `npm run test:one -- BR-0xx` finds it.
- New features start `defaultOn: false`. Turn on when they work.
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
- Work minutes = `fixed + cases × mpc + extra`, then each enabled feature's
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

## Status

- v0.2 (M0) — feature architecture in place: plug-in contract, registry, on/off
  switches, boundary check, scaffold script. Existing behavior moved into four
  feature folders, no behavior change. 39 tests. Sample data only.
- Requirements: `docs/requirements.md` (41 BRs). Build order: `docs/backlog.md`
  (M1 next).
- Findings are browser-local (localStorage); export via "Copy for backlog.md".
- Repo is **public** and auto-deploys to GitHub Pages on push to `main`
  (`.github/workflows/pages.yml`). **Never commit real store, employee or pay data
  while public** — see D-007.
- Not yet: real store data, breaks/meal periods, multi-day/weekly scheduling,
  shared multiplayer clock, real routing, photo capture.
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
