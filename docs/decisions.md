# Decisions log

One entry per decision someone might later question. Newest at the bottom.
Format: ID · date · decision — why.

- **D-001** · 2026-10-23 · Build a throwaway-grade static prototype before writing
  requirements or evaluating vendors — end users can't write user stories but can
  react to screens; the prototype is a requirements-elicitation tool.
- **D-002** · 2026-10-23 · Static Vite + TypeScript app, no backend — fastest to
  iterate, hosts anywhere. Revisit when we need shared findings or a multiplayer clock
  (see D-004).
- **D-003** · 2026-10-23 · Auto-assign stays a naive greedy heuristic. When routing
  quality matters, call VROOM (open-source VRP solver with time windows, working
  hours and breaks) over OSRM via a small service, rather than writing our own
  optimizer.
- **D-004** · 2026-10-23 · Findings stored in browser localStorage and exported via
  copy/paste into `docs/backlog.md`. Known limitation: not shared across devices.
  Planned upgrade: small API (ASP.NET Core + SQLite) once multi-device sessions start.
- **D-005** · 2026-10-23 · Engine is pure (no DOM/storage) with tests; tick advances
  in ≤1-minute steps so departures lock at their planned times. The chat-era
  single-file prototype jumped the clock and drifted departure times — fixed here.
- **D-006** · 2026-10-23 · Sample data is fictional (store chains, people, grid
  coordinates). Real data replaces `src/data/*.json`; sensitive exports stay out of git.
- **D-007** · 2026-10-23 · Repo made **public** and deployed to GitHub Pages so
  testers can open the app from a link (Free plan only supports Pages on public
  repos). Acceptable only while all data is fictional. **Before committing any real
  store list, employee names or actual pay figures, set the repo back to private and
  move hosting** (internal IIS or a password-protected host) — git history can't be
  un-published.
- **D-008** · 2026-10-23 · One feature folder per requirement, plugged into a small
  pure core through declared plug-in points (hooks, curveballs, settings, slots,
  tabs, actions). Features can't import each other; enforced by
  `scripts/check-boundaries.mjs` in `npm run check`. Why: so a change to one
  requirement stays inside its folder and the full test suite proves nothing else
  moved. Cost: a new kind of plug-in occasionally needs a one-time core change.
- **D-009** · 2026-10-23 · Pay math, the clock and event primitives stay in the core
  (every screen depends on them). Features adjust their inputs via hooks rather than
  replacing them.
- **D-010** · 2026-10-23 · Role, market and route type are core fields on people and
  stores (not feature data), because many features need them and features can't
  import each other. Office roles (scheduler, manager, MSL) are viewers, not
  simulated workers.
- **D-011** · 2026-10-23 · Roles change what's *shown*, not the simulation. Each
  browser still runs its own clock; a shared multiplayer clock remains in the backlog.
- **D-012** · 2026-10-23 · Real-world drift (BR-012) is repeatable per scenario and
  store, so a war game can be replayed and compared. Default ±15% skewed toward
  running over.
- **D-013** · 2026-10-23 · Per-store standards scale the global standard by class
  percentage rather than replacing it, so one global edit still moves everything.
