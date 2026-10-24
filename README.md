# Merch Day War Game

A static web prototype for war-gaming a day of **hourly DSD merchandising** before
committing to requirements or buying software. Run a simulated day, throw curveballs
(late trucks, call-outs, heavy loads, extra-visit requests), and capture every
"this won't work because…" as a finding.

## Quick start

Requires Node 20+.

```
npm install
npm run dev
```

Open http://localhost:5173. In Visual Studio or VS Code, open the folder and run
`npm run dev` from the terminal.

## The views

| View | Who it's for | What to look for |
|---|---|---|
| Scheduler | The person building tomorrow's routes | Assignments, route order, timeline, OT projections |
| Merchandiser | Hand it to a real merchandiser on a phone | Is the day understandable? What's missing in-store? |
| Supervisor | Field supervisor during the day | Coverage gaps, alerts, who can absorb a stop |
| Pay & labor rules | Finance / HR / legal | How each rule changes hours and cost per case |
| Findings | Facilitator | Everything people said won't work, exportable |

## Running a session

See [docs/war-game-playbook.md](docs/war-game-playbook.md).

## Using your own data

Replace the JSON in `src/data/`. Field definitions are in
[docs/domain-model.md](docs/domain-model.md).

## Deploying

Every push to `main` builds and publishes to GitHub Pages
(`.github/workflows/pages.yml`). The site is public while the repo is public, so keep
real data out (see `docs/decisions.md`, D-007).

`npm run build` produces a fully static `dist/` folder (relative paths) that can be
served from any web server, an internal IIS site, S3, or GitHub Pages.

## Working on it

Each requirement lives in its own folder under `src/features/`, plugged into a small
core — see [docs/architecture.md](docs/architecture.md). Conventions and current
status are in [CLAUDE.md](CLAUDE.md), written for both humans and AI coding sessions.

```
npm run new-feature -- br-009-store-hours "Store hours" BR-009
npm run test:one -- BR-009
npm run check
```
