# CLAUDE.md — Merch Day War Game

Read this first in every session. Keep it current: when you finish a task, update
**Status** below and add a line to `docs/decisions.md` if you made a choice someone
might later question.

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
npm test           # engine tests (Vitest)
npm run check      # typecheck + tests + production build — run before every commit
npm run build      # static site in dist/ (base './', host anywhere)
```

## Architecture (keep these boundaries)

```
src/
  engine/    PURE domain logic. No DOM, no localStorage, no globals.
    types.ts   domain types (Store, Merchandiser, Rules, SimState, DayPlan, Stop)
    plan.ts    route planning, status, cost — pure functions of SimState
    sim.ts     clock tick, curveball events, assignment, auto-assign (mutate SimState only)
    seed.ts    builds a SimState from seed data + scenario
    time.ts    fmt / parseHHMM / money
    index.ts   the only import path the UI uses
  data/      seed data as JSON (stores, merchandisers, rules, scenarios, lists)
  storage/   browser persistence (findings only)
  ui/        one module per view; each is (ViewCtx) => HTML string
  main.ts    app shell: UI state, DOM event delegation, clock loop
tests/       engine tests — add one for every engine behavior you change
docs/        domain model, pay rules, decisions log, backlog, war-game playbook
```

Rules:
- **All business logic goes in `src/engine` with a test.** Views only format.
- Views return HTML strings. Interactive elements use `data-act="…"` (clicks) or
  `data-assign` / `data-task` / `data-issue` / `data-k` (changes); handlers live in
  `main.ts`'s delegated listeners. Add new actions there, not inline `onclick`.
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
- Work minutes = `fixed + cases × mpc + extra`. Wait = start − arrive (paid).
- Paid = work + wait + between-store drive (if `paidBetween`) + first drive (if
  `paidCommute`). Overtime is weekly: `merch.week` (hours before today) + today.
- Curveballs (`sim.ts`): `delayTruck` (only before work starts), `heavierLoad`,
  `addWork`, `callOut` (finish current stop, release the rest), `extraVisit`.
- `autoAssign` is a deliberately naive greedy pass. Real routing → VROOM (see D-003).

## Status

- v0.1 — ported from the single-file chat prototype. All five views working, 18
  engine tests, sample data only (14 fictional stores, 4 merchandisers).
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
- Prefer editing seed JSON over code when the ask is "make the data look like X".
- Before adding any real data, check whether the repo is still public (D-007). If it
  is, stop and ask the user to make it private first.
- Pay rules are placeholders pending legal review — never present them as fact in UI
  copy. See `docs/pay-rules.md`.
- When a war-game finding is implemented, check it off in `docs/backlog.md` and note
  the commit.
