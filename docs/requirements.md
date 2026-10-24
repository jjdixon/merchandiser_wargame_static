# Requirements outline

> **Status: working draft, approved to build against (2026-10-23).** Open
> questions at the end still need business answers. Merged from the business requirements
> workbook (v1.1, "Requirements" sheet) with the prototype as it stands today.
> Company, vendor and system names are replaced with generic terms while this repo
> is public (D-007). Priorities and releases are blank in the source; build order lives in
> `docs/backlog.md`. Each BR is built as its own feature folder under
> `src/features/` (see `docs/architecture.md`).

## How to read this

Each requirement keeps its source ID (`BR-0xx`) so it can be traced back to the
business document. For each one:

- **Story**: who needs what, and why, in plain words.
- **War-game check**: what the prototype has to let people *try* so the business can
  react to it. This is the prototype's acceptance criterion, not the production one.
- **Prototype status**:
  - ✅ **Covered** — the prototype already lets you try this.
  - 🟡 **Partial** — some of it is there; the gap is listed.
  - ⬜ **Not yet** — buildable in the prototype.
  - 🔌 **Simulate only** — real version needs integration or infrastructure; the
    prototype can only fake the inputs/outputs to test the workflow.
  - 🚫 **Out of prototype scope** — a policy, platform or procurement decision, not
    something to war-game on screen. Tracked here so it isn't lost.
- **Open questions** for the business.

## Glossary additions

| Term | Meaning |
|---|---|
| Large Format (LF) | A route type, defined by the kind of stores on it (large-format stores). |
| Traditional, Xpress | Other route types. Relief staff can cover LF and Traditional routes. |
| LF Merchandiser | The new hourly role that works LF stores. |
| LFSP | Today's LF route role that does everything (ordering, delivery-side tasks, merchandising). **Being retired**; its work splits into centrally controlled ordering plus hourly invoice, inventory and merchandising work. |
| MSL (Market Sales Leader) | Leader who sits above the merchandisers in a market. |
| LF Merchandiser Manager | Manages LF merchandisers (portal user). |
| LF Merchandiser Scheduler | Builds and publishes schedules (portal user). |
| Hourly Vacation Relief | Covers planned absences (vacations). |
| Route Jumper | Floater who helps finish unfinished routes and stores during the day. |
| RSP | Route Sales Professional. |
| IBP | Independent Business Partner (independent distributor). |
| Down-day | A non-delivery day. Wednesday and Sunday are generally the down-days across all route types. |
| Pull-up | A merchandising run with no fresh delivery, typically on a down-day. |
| Second visit | A second same-day visit to a store, possibly by a different worker, merchandising only. |
| Ordering system | The central ordering system that now controls orders. |
| Warehouse system | The warehouse management system that produces load cuts/adds. |
| Delivery tracking tool | The internal tool showing where trucks are and expected arrival. |
| Expense system | The system that receives reimbursable mileage. |
| Carriers | Third-party logistics partners that run some deliveries. |

## Scope decisions applied in this draft

- The workbook's second sheet ("Capability Details") describes a **customer web
  ordering application** (order entry, product search, payments, customer login).
  It is **excluded** from this project. Revisit if it was meant to be included.
- Source IDs BR-018, BR-019, BR-023 and BR-032 are absent from the workbook. Not
  invented here; see open questions.

---

## Module A — Large Format Merchandiser

### A1. Roles and access

**BR-001 Role-based access and workforce roles** · ✅ Covered (M1) · `br-001-role-access`
- **Story:** Managers, schedulers and admins use a portal; merchandisers, MSLs,
  vacation relief and route jumpers use a mobile app. Each sees only their area,
  route, stores and responsibilities.
- **War-game check:** pick a role at the start and see only that role's screens and
  scope (e.g. a merchandiser sees only their own day; an MSL sees their market).
- **Today:** a *Viewing as* picker (facilitator, scheduler, manager, MSL per market,
  each merchandiser / relief / jumper) limits tabs, people and stores. Admin and
  identity/approval workflow are not modeled.
- **Open questions:** Which roles exist on day one? Can an MSL also act as scheduler?

### A2. Scheduling and coverage

**BR-003 Digital route bidding and scheduling** · ⬜ Not yet
- **Story:** Hourly merchandisers and relief staff bid on routes/runs digitally
  instead of on paper; schedulers award, schedule and publish.
- **War-game check:** open a bid window, have players bid on a few runs, see
  eligibility, award by the chosen rule, and publish the resulting schedule.
- **Open questions:** What decides an award (seniority, qualification, hours)? How
  often do bids happen? Which rules are union-governed?

**BR-004 Dynamic route and store reassignment** · 🟡 Partial
- **Story:** A scheduler can add, remove or move a route or store between workers, or
  split uncovered work, without changing who permanently owns it. Changes keep
  history and notify the people affected.
- **War-game check:** reassign today only vs. permanently; split one store's work
  between two people; see a change log and the notification each person gets.
- **Today:** reassign individual stores for the day, reorder stops, coverage buttons
  on call-out. Missing: route-level moves, splitting a store, "today only" vs.
  "master" ownership, change history, notifications.
- **Business feedback:** plans will be **hybrid**: route-based on regular days,
  more flexible on down-days. Needs to stay flexible.

**BR-005 Vacation and cross-model relief coverage** · ⬜ Not yet
- **Story:** Vacation bidding and relief pools keep service going during absences
  across LF, Traditional and Xpress routes. When relief staff aren't assigned, show
  their availability and give them productive work.
- **War-game check:** a relief pool with qualifications by route type; book a
  vacation; see relief assigned; see idle relief offered as helpers.
- **Open questions:** Can LF relief cover Xpress routes too, or only LF and
  Traditional? How far ahead are vacations bid?

**BR-006 Workload optimization and route jumping** · 🟡 Partial
- **Story:** Recommend nearby available workers to help unfinished routes, support a
  Route Jumper role, and optimize by remaining hours, location, workload and skills.
  Goal: push-button daily optimization.
- **War-game check:** a jumper starts the day unassigned; the supervisor view
  recommends where to send them; a one-click "optimize remaining day".
- **Today:** greedy auto-assign and "who could finish this" buttons consider finish
  time, overtime and lateness. Missing: jumper role, skills, splitting work to help.

**BR-007 Hours, availability and overtime control** · 🟡 Partial
- **Story:** Show worked and remaining hours against weekly guarantees, warn
  schedulers before limits, explain unfinished work when someone hits their maximum,
  and allow daily hours to vary within the weekly guarantee.
- **War-game check:** each worker has a weekly guarantee and maximum; the scheduler
  sees remaining hours per person; at the maximum, the app stops assigning and asks
  for a reason the remaining work is unfinished.
- **Today:** weekly projection and overtime warnings. Missing: guaranteed hours,
  hard maximums, the "why unfinished" capture.
- **Open questions:** Labor/union rules need a discovery session (see pay-rules.md).

**BR-008 Holiday and multiple-visit scheduling** · 🟡 Partial
- **Story:** Apply holiday service patterns automatically and support two or more
  visits to the same store in one day, by different workers, including a
  merchandising-only second visit.
- **War-game check:** a holiday scenario that changes delivery days and patterns, and
  planned second visits on the schedule (not just a curveball).
- **Today:** "Holiday volume" scenario only scales cases; "extra visit" exists only
  as a curveball.

**BR-010 Schedule governance** · 🟡 Partial
- **Story:** Merchandisers can't change their own schedules. Authorized schedulers
  publish controlled changes. Customers get stable, expected service days and times.
- **War-game check:** schedules have Draft and Published states; changes after
  publishing are tracked and flagged when they move a store's usual service time.
- **Today:** merchandisers can't edit (by design), but there is no draft/publish step.

### A3. Workforce time, location and pay

**BR-011 Automatic store presence and geofence exceptions** · 🟡 Partial
- **Story:** Detect store entry and exit automatically, with exact timestamps, no
  manual check-in. Flag missing or broken geofence events for review.
- **War-game check:** a curveball that drops an entry or exit event; it shows up in a
  review queue that a manager resolves.
- **Today:** check-in is simulated as automatic. No exceptions.
- **Open questions:** Privacy, consent and device-location policy review.

**BR-012 Time and mileage capture** · 🟡 Partial (M1) · `br-012-planned-vs-actual`
- **Story:** Track time from the first store to leaving the last store, capture
  mileage and drive segments, and compare engineered (planned) against actual time.
- **War-game check:** each stop shows planned vs. actual drive and work time; the
  day summary shows the variance.
- **Today:** paid time, mileage and commute rules; engineered vs. actual drive and
  work per stop with repeatable real-world drift, planned vs. actual start, day
  totals. Missing: GPS-based mileage (with geofencing, M3).
- **Open questions:** Home-to-first-store and last-store-to-home rules.

**BR-013 Payroll and expense integration** · 🔌 Simulate only
- **Story:** Approved hours, overtime and mileage flow to payroll and the expense
  system, with worker identity and exception/reconciliation status.
- **War-game check:** a timesheet approval step for the manager, and a preview of the
  payroll and mileage export.

### A4. Route execution and delivery

**BR-009 Store hours and delivery-aware start times** · 🟡 Partial (M1) · `br-009-store-hours`
- **Story:** Store each store's merchandising and invoicing hours, set start times
  from expected delivery, and when a truck is late, guide the worker to wait,
  resequence, or move on to the next store.
- **War-game check:** per-store receiving/merchandising windows; when a truck is
  late, the merchandiser's phone offers Wait / Go to next store / Swap order, and
  shows the effect of each on their day.
- **Today:** receiving (invoicing) and merchandising hours per store, editable; start
  waits for receiving; alerts when a truck lands after receiving closes or work runs
  past merch hours. Missing: the late-truck decision prompt (T-302, M3).

**BR-014 Truck delivery visibility** · 🟡 Partial
- **Story:** Workers see expected arrival, delays and completed delivery before
  leaving for or entering a store. Affected workers and managers are notified.
- **War-game check:** each stop shows delivery status (scheduled / en route / late /
  delivered); a late truck notifies the merchandiser *before* they leave.
- **Today:** ETAs and late-truck curveballs exist; the merchandiser only finds out
  on arrival.

**BR-016 Daily route playbook and priorities** · ⬜ Not yet
- **Story:** Each worker gets a playbook for the day: ordered work, expected units,
  promotions, displays, fixtures, SKUs, store constraints and completion steps, so
  the plan is clear even when the MSL isn't there.
- **War-game check:** a per-store playbook screen built from seed data plus
  manager-set priorities.
- **Note:** The source asks for an AI/data-warehouse-generated playbook. The
  prototype uses hand-written seed data to test what the playbook should contain.

**BR-017 Order and load adjustment visibility** · 🔌 Simulate only
- **Story:** Show expected orders, delivered vs. ordered quantities, order fill, and
  cuts/adds made after load validation, automatically sent to the right people.
- **War-game check:** a "load cut/add" curveball that changes a store's cases and
  notifies the merchandiser and MSL.
- **Today:** "Heavier load" curveball covers adds; no cuts, no ordered-vs-delivered.

### A5. In-store workflow

**BR-002 Merchandising visit execution (operating model)** · ✅ Covered (M2) · `br-002-guided-visit`
- **Story:** Support the LF Merchandiser's in-store work under the new model, where
  ordering is central and the old LFSP work becomes hourly invoice, inventory and
  merchandising activities.
- **Business feedback (MVP):** The app walks the merchandiser through: note
  backstock → go through each display (and aisle) as a workflow → validate each task
  is done → identify out-of-stocks. Out-of-stocks trigger a workflow in the inventory
  and ordering app. Tasks are embedded in the workflow (e.g. "build display" then
  "validate built").
- **War-game check:** the phone view becomes a step-by-step guided visit in that
  order, with gating (can't close out until required steps are done).
- **Today:** guided visit in the MVP order (backstock → displays → aisles → validate →
  out-of-stocks), gated close-out, out-of-stocks routed as the stand-in for the
  inventory/ordering workflow. "Play this merchandiser" makes a person's real speed
  the labor time.
- **Open questions:** Does every step need a photo, or only some? What else besides
  displays and invoicing/inventory does the merchandiser own in-store?

**BR-015 Guided single-app mobile workflow** · 🟡 Partial (M2) · `br-002-guided-visit`
- **Story:** For a high-turnover workforce: an app that tells the worker the next
  best action, minimizes choices and duplicate entry, and puts core work in one app.
- **War-game check:** the phone home screen shows one "Next" action at a time
  (drive to X / wait / start step Y), and a new player can run a day with no
  training.
- **Today:** a "Next" card always shows the one thing to do now; steps are guided.
  Not yet measured: whether a new player can run a day with no training (BR-030).

**BR-020 Out-of-stock and void root-cause capture** · 🟡 Partial (M2) · `br-020-oos-root-cause`
- **Story:** Record out-of-stocks and voids with a root cause (order fill, delivery,
  inventory, merchandising, ordering, other) and notify the responsible role,
  ideally before the stockout.
- **War-game check:** logging an out-of-stock asks for product and cause; it routes
  an alert to the role that owns that cause.
- **Today:** done as above, with a Supervisor list by owner. Missing: automatic
  detection and warning before a projected stockout.
- **Today:** "Log out-of-stocks" is just a checkbox.

**BR-021 Merchandising visit execution (standards)** · 🟡 Partial (M2) · `br-002-guided-visit`
- **Story:** Guide store-specific tasks, planogram/shelf compliance, display tracking,
  pull-ups, completion confirmation, photo capture where required, and closeout.
- **War-game check:** store-specific task lists; a photo step (upload) where
  required; visit closeout summary.
- **Today:** store-specific aisles and displays, photo steps, gated close-out. Missing:
  planogram compliance and the business's detailed task standards.
- **Open questions:** Detailed task standards are still to be defined.

**BR-022 Display awareness and assignment** · ✅ Covered (M2) · `br-022-display-awareness`
- **Story:** Merchandisers see upcoming and active displays for each store: sold-in
  status, fixture, products, timing, delivery method, required actions. Fed by the
  Display Tracking module.
- **War-game check:** each store's playbook lists its displays and feeds them into the
  guided visit (BR-002).

### A6. Standards, reporting and oversight

**BR-024 Engineered work standards and capacity** · 🟡 Partial (M1) · `br-024-work-standards`
- **Story:** Planned drive time, merchandising time, expected units/cases, units per
  hour and workload assumptions are set **per store/route**, not one universal rate.
- **War-game check:** labor standards editable per store (with a default), and the
  scheduler sees how store complexity changes the plan.
- **Today:** store complexity classes (simple / standard / complex) scale the global
  standard; class editable per store; cases per hour shown. Missing: route-level
  standards and an agreed method for setting them.
- **Open questions:** What's the numerator (units or cases)? How is store complexity
  defined? Who sets standards, and how?

**BR-025 KPI scorecard and coaching** · ⬜ Not yet
- **Story:** Weekly scorecards for schedule adherence, time, mileage, units per hour,
  completion, sales, out-of-stocks, display execution, responsibilities completed and
  exception trends. Workers see their own goals and results.
- **War-game check:** an end-of-day scorecard per merchandiser and a manager view
  comparing them.
- **Open questions:** KPI definitions and targets need business approval.

**BR-026 Exception-based reporting** · 🟡 Partial
- **Story:** Weekly exception reports with drill-down to day, worker, route, store,
  visit, activity, geofence, delivery, overtime and incomplete work, so managers
  don't have to make phone calls.
- **War-game check:** an exceptions view grouped by type with drill-down to the
  stop.
- **Today:** a live alert feed for the day only.

**BR-027 Scheduled vs. actual workforce visibility** · 🟡 Partial
- **Story:** See who is available, where they were scheduled, where they actually
  are, progress, time by activity and second-visit coverage, across LF, Traditional,
  part-time and relief staff, including down-day work.
- **War-game check:** the timeline shows planned and actual bars together; the
  supervisor view covers relief and down-day runs.
- **Today:** live status and map for LF merchandisers on a single day.

**BR-028 Operational messaging and escalation** · 🟡 Partial
- **Story:** Role-based messaging (or enterprise chat/email) for late trucks, route
  changes, stock risks, extra work, priorities and escalations, linked to the
  affected route, store or visit.
- **War-game check:** two-way messages between merchandiser, MSL, scheduler and
  driver, each tied to a stop.
- **Today:** merchandiser issues become one-way supervisor alerts.
- **Open questions:** Preferred channel and retention policy.

**BR-031 Manager market leadership and remote oversight** · 🟡 Partial
- **Story:** Managers see execution, staffing, exceptions, photos, productivity and
  completion remotely, so they can coach in market instead of checking work in
  person.
- **War-game check:** the supervisor view plus photo review and scorecards.
- **Today:** supervisor view without photos or scorecards.

**BR-030 Training and in-app guidance** · ⬜ Not yet
- **Story:** Role-based onboarding, guided workflows, standard work, searchable help.
- **War-game check:** first-run tips on each screen; measure whether a new player can
  complete a day unaided.

### A7. Platform and enterprise (tracked, not war-gamed)

**BR-029 Device and peripheral strategy** · 🚫 Out of prototype scope
- Devices, printers, scanners, home storage, loaners, connectivity, BYOD. A policy and
  procurement decision. Open: BYOD vs. company devices; illness/coverage handoff.

**BR-033 Enterprise data and AI integration** · 🚫 Out of prototype scope
- Source systems, ownership, latency and AI governance need discovery.

**BR-034 Solution reliability** · 🚫 Out of prototype scope
- Phased rollout, security, audit logging, availability, performance, offline
  resilience, scale. *Offline* behavior is worth one war-game scenario later
  ("phone loses signal in the back room").

---

## Module B — Display Tracking

**BR-035 Sales hierarchy, territory, route and role-based access** · 🚫 Mostly out of scope
- **Story:** Assign display work using the sales hierarchy, with access by enterprise,
  region, market, territory, route, store, customer, brand and user, including
  multi-route stores, jumpers, substitutes and temporary coverage.
- **War-game check (light):** seed data carries market and route so display tasks
  follow temporary coverage when a store is reassigned.

**BR-036 Promotion and display data feed** · 🔌 Simulate only
- **Story:** Load promotions and display standards (stores, banners, brands, product
  groups, display types, locations, dates, instructions, reference images, reason
  codes), with spreadsheet upload as a fallback, automatic task creation and
  versioning.
- **War-game check:** promotions defined in seed JSON (or a pasted spreadsheet) that
  generate store display tasks.

**BR-037 Store-level display task assignment and workflow** · ⬜ Not yet
- **Story:** Create and assign display tasks per store from promotions and routes:
  setup, photo evidence, recurring checks, expiration, completion, reassignment,
  standard absence reasons, gating, reminders, overdue status, escalation and
  manager follow-up.
- **War-game check:** display tasks appear in the merchandiser's guided visit; a
  missed display needs an absence reason; overdue tasks escalate to the MSL.
- **Target:** raise compliance from roughly 30–50% today toward a configurable goal
  (e.g. 80%+).

**BR-038 Mobile, embedded, low-effort frontline experience** · 🟡 Partial
- **Story:** Fast, mobile-first, embedded in existing work, using guided selections,
  defaults, scanning, values derived from photos and offline sync, with minimal
  typing. Aspirational capture time: about 20 minutes per user per week.
- **War-game check:** time how long a player takes to record a day's displays.

**BR-039 Photo capture, geolocation and image recognition** · 🟡 Partial (M2) · `br-039-photo-capture`
- **Story:** Display photos carry store, task, time, user/route and location; image
  recognition identifies product group/brand, display type/location and likely
  non-compliance (SKU-level not required at first).
- **War-game check:** photo upload on a display step with auto-filled metadata;
  recognition simulated (e.g. a "suggested result" the user confirms or corrects).
- **Today:** switchable photo policy, photos with metadata, simulated recognition
  with confirm / wrong. Real recognition is out of scope until accuracy is proven.
- **Open questions:** Accuracy thresholds, human review and correction process.

**BR-040 Display lifecycle, compliance and exceptions** · ⬜ Not yet
- **Story:** Keep each store's display history from setup to removal, with expected
  vs. actual dates, location, brand, type, status, duration, photos and compliance
  result. States: compliant, partially compliant, non-compliant, absent, not
  applicable, unable to verify.
- **War-game check:** display records move through those states during the sim;
  managers can review and override.

**BR-041 Store profile, notes and supporting context** · ⬜ Not yet
- **Story:** A store page with identifiers, address, banner, route/brand coverage,
  contacts, constraints, open tasks, recent history and performance, plus searchable
  structured notes (category, author, visibility, follow-up, photos).
- **War-game check:** a store page reachable from every view, with notes that carry
  over between visits and workers.

**BR-042 Store-level sales and promotion impact** · 🚫 Out of prototype scope
- Needs real daily store sales. Could be mocked later to show what the analysis
  would look like, but it can't be war-gamed meaningfully on fake data.

**BR-043 Reporting, dashboards and centralized photo review** · ⬜ Not yet
- **Story:** Role-based dashboards and one place to review photos for planned,
  assigned, completed, overdue, absent, compliant and non-compliant tasks, with rates
  across user, route, store, banner, market and time; suspected non-compliance first.
- **War-game check:** a photo review queue and a display compliance dashboard for
  the simulated day.

**BR-044 Integration and data exchange** · 🚫 Out of prototype scope
- APIs and scheduled files for identity, hierarchy, routes, stores, products,
  promotions, orders, sales, task status and photos.

**BR-045 Adoption, change management and accountability** · 🚫 Mostly out of scope
- Track active users, completion, time to complete, photo success, exceptions and
  corrections. The prototype can show what an adoption view would contain.
- **Open questions:** Labor, union and independent-partner (IBP) implications before
  any step becomes mandatory.

---

## Where each requirement lives

Updated as features land. To change a requirement, edit only its folder
(see `docs/architecture.md`).

| Requirement(s) | Feature folder | Notes |
|---|---|---|
| BR-007, BR-012, BR-024 (settings) | `src/features/pay-labor-rules` | Pay math itself is core (`src/engine/plan.ts`) |
| BR-004, BR-008, BR-014, BR-017 (disruptions) | `src/features/curveballs` | Event primitives are core (`src/engine/sim.ts`) |
| BR-007, BR-014, BR-026 (alerts) | `src/features/day-alerts` | |
| BR-001 (roles, access) | `src/features/br-001-role-access` | Roles/markets/route types are core data |
| BR-009 (store hours) | `src/features/br-009-store-hours` | Late-truck prompt is M3 |
| BR-012 (planned vs actual) | `src/features/br-012-planned-vs-actual` | |
| BR-024 (work standards) | `src/features/br-024-work-standards` | |
| BR-002, BR-015, BR-021 (guided visit) | `src/features/br-002-guided-visit` | Steps and answers are core (`src/engine/visit.ts`) |
| BR-022 (display awareness) | `src/features/br-022-display-awareness` | Full Display Tracking is M5 |
| BR-020 (out-of-stocks) | `src/features/br-020-oos-root-cause` | |
| BR-039 (photos) | `src/features/br-039-photo-capture` | Photo review queue is BR-043, M5 |
| War-game findings | `src/features/findings` | Not a business requirement |

## Open questions (consolidated)

1. Were BR-018, BR-019, BR-023 and BR-032 removed on purpose?
2. Should the customer web ordering material ("Capability Details" sheet) be part of
   this project?
3. Traditional and Xpress routes: what differs from LF, and which can relief staff
   cover?
4. Bidding (BR-003): what decides an award, and how often?
5. Labor/union rules (BR-007, BR-010, BR-011, BR-012): discovery session needed.
6. Photo requirements (BR-002, BR-021): which steps require a photo?
7. Work standards (BR-024): units or cases, store complexity, who sets them.
8. KPI definitions and targets (BR-025).
9. Messaging channel and retention (BR-028).
10. Geofence privacy and consent policy (BR-011).

## Prototype coverage at a glance

| Status | Count | IDs |
|---|---|---|
| ✅ Covered | 3 | 001, 002, 022 |
| 🟡 Partial | 19 | 004, 006, 007, 008, 009, 010, 011, 012, 014, 015, 020, 021, 024, 026, 027, 028, 031, 038, 039 |
| ⬜ Not yet | 9 | 003, 005, 016, 025, 030, 037, 040, 041, 043 |
| 🔌 Simulate only | 3 | 013, 017, 036 |
| 🚫 Out of scope | 7 | 029, 033, 034, 035, 042, 044, 045 |
| **Total** | **41** | |
