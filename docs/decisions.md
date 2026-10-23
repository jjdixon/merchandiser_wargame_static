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
