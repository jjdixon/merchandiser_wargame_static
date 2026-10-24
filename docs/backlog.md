# Backlog

Build order for the prototype, traced to `docs/requirements.md` (BR IDs).

**How this works**
- Work is grouped into milestones. Each milestone is one branch and one pull request,
  reviewed (and war-gamed if useful) before the next merges.
- Each requirement is built as its own feature folder, `src/features/br-0xx-<name>/`,
  so changing one requirement later touches only that folder
  (see `docs/architecture.md`).
- Tick the box and add the PR number when an item merges.
- War-game findings go in *Inbox* at the bottom, then get triaged into a milestone.

Sizes are rough: **S** ≈ a short session, **M** ≈ one full session, **L** ≈ split
across sessions.

---

## M0 — Feature architecture (foundation, no new behavior) · merged #1

- [x] **T-001** (#1) Feature plug-in contract, registry and on/off switches · M
- [x] **T-002** (#1) Move existing pieces into features: pay & labor rules, curveballs,
      day alerts, findings · M
- [x] **T-003** (#1) Boundary check (features can't import each other; engine stays pure),
      new-feature scaffold, `docs/architecture.md` · S

## M1 — Foundation for the requirements · merged #2

- [x] **T-101** (#2) Per-store labor standards with defaults; scheduler sees the effect
      · BR-024 · `br-024-work-standards` · M
- [x] **T-102** (#2) Store merchandising and invoicing hours; start times respect them
      · BR-009 · `br-009-store-hours` · M
- [x] **T-103** (#2) Route types (LF, Traditional, Xpress) and roles (merchandiser, MSL,
      vacation relief, route jumper, scheduler, manager) in the data · BR-001, BR-005 · S
- [x] **T-104** (#2) Role picker that limits which screens and stores you see · BR-001 · M
- [x] **T-105** (#2) Planned vs. actual time per stop and per day (actuals drift from plan
      with realistic variation) · BR-012 · `br-012-planned-vs-actual` · M

## M2 — Guided store visit (the BR-002 MVP) · merged #3

- [x] **T-201** (#3) Step-by-step visit: note backstock → each display → each aisle →
      validate → out-of-stocks; can't close out until required steps are done
      · BR-002, BR-015, BR-021 · `br-002-guided-visit` · L
- [x] **T-202** (#3) Displays per store feed visit steps · BR-022 · `br-022-display-awareness` · M
- [x] **T-203** (#3) Out-of-stock capture with root cause, routed to the owning role
      · BR-020 · `br-020-oos-root-cause` · M
- [x] **T-204** (#3) Photo step (upload), auto-filled metadata, simulated recognition
      suggestion · BR-039 · `br-039-photo-capture` · M
- [x] **T-205** (#3) "Next action" home screen on the phone · BR-015 · S

## M3 — Day-of disruptions · merged #4

- [x] **T-301** (#4) Delivery status per stop; late-truck notice *before* leaving
      · BR-014 · `br-014-truck-visibility` · M
- [x] **T-302** (#4) Late-truck decision prompt: wait / go to next store / swap order, with
      the effect on the day · BR-009 · M
- [x] **T-303** (#4) Load cuts and adds curveball, ordered vs. delivered, notifications
      · BR-017 · `br-017-load-adjustments` · S
- [x] **T-304** (#4) Two-way messages tied to a stop (merchandiser, MSL, scheduler,
      driver) · BR-028 · `br-028-messaging` · M
- [x] **T-305** (#4) Geofence exceptions (missing entry/exit) and a review queue
      · BR-011 · `br-011-geofence-exceptions` · M

## Added between milestones

- [x] **T-206** Practice visit: click through any store's visit in a sandbox, no
      clock, nothing saved to the day · BR-002 · `br-002-guided-visit` · S

## M4 — Scheduling (starts with the week model)

- [ ] **T-400** Week model: simulate several days, carry hours forward, down-days
      (Wed/Sun) with pull-up runs · architecture · L
- [ ] **T-401** Draft vs. published schedules, change history, flag changes to a
      store's usual service time · BR-010, BR-004 · `br-010-schedule-governance` · M
- [ ] **T-402** Today-only vs. permanent reassignment; split a store's work · BR-004 · M
- [ ] **T-403** Weekly guaranteed and maximum hours; "why unfinished" at the
      maximum · BR-007 · `br-007-hours-guarantees` · M
- [ ] **T-404** Planned second visits and holiday service patterns
      · BR-008 · `br-008-multi-visit-holiday` · M
- [ ] **T-405** Route jumper role and "send help here" recommendations
      · BR-006 · `br-006-route-jumping` · M
- [ ] **T-406** Vacation booking and relief pool with route-type qualifications
      · BR-005 · `br-005-relief-coverage` · M
- [ ] **T-407** Route/run bidding: window, eligibility, award, publish
      · BR-003 · `br-003-route-bidding` · L

## M5 — Display tracking

- [ ] **T-501** Promotions and display standards from seed data or pasted
      spreadsheet; generate store tasks · BR-036 · `br-036-promotion-feed` · M
- [ ] **T-502** Display task lifecycle: setup, recurring checks, expiry, absence
      reasons, overdue, escalation · BR-037 · `br-037-display-tasks` · L
- [ ] **T-503** Compliance states (compliant … unable to verify) with manager review
      · BR-040 · `br-040-display-compliance` · M
- [ ] **T-504** Store page with structured notes · BR-041 · `br-041-store-profile` · M
- [ ] **T-505** Photo review queue and display compliance dashboard
      · BR-043 · `br-043-photo-review` · M

## M6 — Reporting and oversight

- [ ] **T-601** End-of-day scorecard per merchandiser and manager comparison
      · BR-025 · `br-025-scorecards` · M
- [ ] **T-602** Exceptions report grouped by type with drill-down · BR-026 · M
- [ ] **T-603** Scheduled vs. actual across LF, relief and down-day work · BR-027 · M
- [ ] **T-604** Timesheet approval and payroll/mileage export preview
      · BR-013 · `br-013-timesheet-export` · M
- [ ] **T-605** First-run tips per screen · BR-030 · S

## Not planned for the prototype

BR-029, BR-033, BR-034, BR-035, BR-042, BR-044, BR-045 — see `docs/requirements.md`
for why. One exception worth adding later: an "offline in the back room" scenario
(BR-034).

## Data

- [ ] Load real data for one route area — **only after the repo is private** (D-007).

---

## Inbox (untriaged findings)

<!-- Paste exported findings here under a heading like: ### Session 1 — 2026-11-05 -->
