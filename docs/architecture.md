# Architecture: one requirement, one folder

The goal: when someone asks to change a requirement (say BR-009), the change
touches **only that requirement's folder**, and the test suite proves nothing else
moved.

```
src/
  engine/        CORE — clock, people, stores, day plan, pay math, event primitives.
                 Pure TypeScript. Knows nothing about any feature.
  app/feature.ts CONTRACT — what a feature may plug into (screen side).
  ui/            CORE VIEWS — Scheduler, Merchandiser, Supervisor, Rules. Expose slots.
  data/          Seed data (stores, people, rules, scenarios).
  features/      ONE FOLDER PER REQUIREMENT (or per war-game tool)
    index.ts       the registry — the only list of features
    <id>/
      engine.ts      pure logic + plug-ins (tested without a browser)
      engine.test.ts tests, named with the feature id and its BR IDs
      ui.ts          panels, tabs, actions (optional)
      index.ts       combines engine + ui into one Feature
      README.md      story, war-game check, decisions
  main.ts        APP SHELL — wires registry, views, clock and events together
```

## The plug-in points

A feature declares what it plugs into. The core calls these; it never imports a
feature. Engine-side points live in `src/engine/types.ts` (`EngineFeature`);
screen-side ones in `src/app/feature.ts` (`Feature`).

| Plug-in | Where it's used | Example use |
|---|---|---|
| `readyAt(state, store, base)` | when product is workable (default: truck ETA + buffer) | store receiving hours (BR-009) |
| `workMinutes(state, store, base)` | labor minutes for a visit (default: fixed + trays × mpt + cases × mpc + extra) | per-store standards (BR-024) |
| `onTick(state)` | after every clock step (≤ 1 min) | alerts, geofence events, actual-time drift |
| `curveballs` | the header *Throw a curveball* bar | load cuts/adds (BR-017) |
| `settings` + `ruleDefaults` | the *Pay & labor rules* screen; values in `rules.feature` | a per-feature switch or number |
| `panels` (slot + render) | slots: `header`, `sched.after`, `merch.after`, `super.main`, `super.aside`, `rules.after` | alert feed, role picker, store hours |
| `views` | a whole new tab | Findings, photo review (BR-043) |
| `actions` / `changes` | clicks/changes on `data-act="<id>:<name>"` / `data-fchange="<id>:<name>"` | buttons inside a feature's panel |
| `access(app)` | who is looking: allowed tabs, people, stores, locked phone | role picker (BR-001) |
| `views[].public` | tab visible to every role | Findings |
| `visitSteps(state, store)` | add steps to a store visit (phase: backstock → display → aisle → validate → oos → closeout; kind: check / count / counts / choice / entries; required, photo) | displays, out-of-stocks, backstock counts |
| `adjustStep(state, store, step)` | change any feature's step before it's shown | photo policy (BR-039) |
| `onStepAnswered(state, store, step, answer)` | react to any answer, by a person or the sim | route out-of-stocks, record photos |
| `hash01(key)` / `pickShare(ids, salt, pct)` | repeatable "random" choices; exactly pct% of items | late trucks, load changes, geofence problems |
| `app.viewer` | who's viewing (from the access plug-in), for "sent as" etc. | messaging |
| `onDayStart(state)` | when a day is built: change who's out, which stores, volumes (read week state only) | vacations, holidays, second visits |
| `onDayEnd(state)` | when the facilitator ends the day (write week state here) | usual service times |
| `weekState(state, id, init)` | a feature's own week-scoped state, survives across days | bids, vacations, change log |
| `store.backstock` | arrival / leaving backstock (trays, cases), written by NR-002 | order feedback (NR-003) |
| `state.week.master` | permanent store owners from the next day on | permanent reassignment, bid awards |
| `splitWork(state, store, to, share)` | move part of a store's remaining work to a helper | split, send help |
| `ctx.projectDay(day)` / `app.projectDay(day)` | a future day as planned, without changing anything | Week view, hours this week |
| `featureState(state, id, init)` | a feature's own day-scoped state in `state.fx[id]` | baselines, recorded times (BR-012) |
| `mount(app)` | once at startup — **locked features only** | floating findings button |

Hooks of the same kind run in registry order, each receiving the previous value.

## Rules (enforced by `npm run boundaries`, part of `npm run check`)

1. **`src/engine` is pure** — imports only itself, no browser APIs.
2. **Features never import each other.** If two features need to cooperate, add a
   plug-in point or a field to the core.
3. **A feature's `engine.ts` is pure** — imports only `src/engine` and `src/data`.
   Screen code goes in its `ui.ts`.
4. **Only `src/main.ts` and `src/features/index.ts` import feature folders.**

## On/off switches

Every feature has one (Pay & labor rules screen → *Features*), saved per browser.
Locked features (pay rules, findings) are always on. New features start **off**.
Switching mid-day is safe: stops already departed for are locked, so only the rest
of the day changes.

## Changing a requirement

1. Find its folder: `docs/requirements.md` → *Where each requirement lives*.
2. Edit only that folder. Run `npm run test:one -- BR-0xx` while working.
3. Run `npm run check` — the full suite and the boundary check must pass. That's
   the evidence nothing else changed.
4. If the change can't be done without touching `src/engine`, `src/ui` or another
   feature, **stop and say why first**. Usually the answer is a new plug-in point,
   added once, with its own test in `tests/features.test.ts`.

## Adding a requirement

```
npm run new-feature -- br-009-store-hours "Store hours" BR-009
```

Creates the folder from a template, registers it, and starts it switched off.

## What stays in the core (and why)

- **Clock and locking** (`tick`, `store.lock`) — every feature relies on history
  being frozen.
- **Day plan and pay math** (`plan`, `summarize`, `totals`) — every screen shows hours
  and cost. Features adjust inputs through hooks rather than replacing the math.
- **Event primitives** (`delayTruck`, `heavierLoad`, `addWork`, `adjustDrive`,
  `adjustWork`, `callOut`, `extraVisit`, `assign`, `move`, `raise`) — shared by curveballs and merchandiser
  actions.
- **The four core views** — they define the slots features fill, and apply the
  viewer's scope (`ctx.scope`) to people and stores.
- **The week model** (`src/engine/week.ts`, `src/ui/week.ts`, `src/data/week.json`):
  each day is a fresh SimState built from the seed (Thursday), weekly patterns
  (delivery vs pull-up days per route type) and the week so far (hours, permanent
  owners, week state). The header's *End day →* rolls today into the week.
- **Store visit steps and answers** (`src/engine/visit.ts`, `store.answers`): so
  displays, out-of-stocks and photos can each be their own folder while the guided
  visit shows them all.
- **People and store attributes many features need**: role, market, route types
  (people); route type, market (stores).
