# Domain model

## Glossary

| Term | Meaning |
|---|---|
| DSD | Direct store delivery: we deliver product to the store ourselves and merchandise it. |
| Merchandiser | Hourly employee who works delivered product onto the shelf. |
| Truck ETA | When our delivery arrives at the store. |
| Ready time | Truck ETA + receiving buffer. Before this, product can't be worked. |
| Done-by | Time the store wants merchandising finished (e.g. before lunch rush). |
| Labor standard | Expected minutes for a visit: fixed minutes + minutes per case × cases. |
| Paid idle | Time a merchandiser is on the clock at the store waiting for the truck. |
| Between-store drive | Driving from one store to the next during the day. |
| Commute | Home → first store, and last store → home. |
| Locked stop | A stop the merchandiser has already left for. Its times are history. |
| Curveball | An injected event: late truck, heavy load, call-out, extra visit. |

## Seed data files (`src/data/`)

### stores.json

| Field | Type | Notes |
|---|---|---|
| id | string | Unique. Keep stable — tests and scenarios reference ids. |
| name | string | Display name, e.g. "ValuMart #1042". |
| x, y | number | Position in km on a flat grid. Replace with lat/long when real data arrives (see backlog). |
| cases | number | Cases delivered today. |
| truckEta | "HH:MM" | 24-hour. |
| doneBy | "HH:MM" | Store's requested completion time. |
| assignedTo | string \| null | Merchandiser id, or null for uncovered. |
| order | number | Route order within that merchandiser's day. |

### merchandisers.json

| Field | Type | Notes |
|---|---|---|
| id, name | string | |
| x, y | number | Home location (km grid). |
| hoursThisWeek | number | Paid hours already worked before the simulated day. Drives OT projection. |

### rules.json

See [pay-rules.md](pay-rules.md). `shiftStart` is "HH:MM"; everything else is a number or boolean.

### scenarios.json

| Field | Notes |
|---|---|
| id, label | Shown in the Scenario menu. |
| truckDelays | `{ storeId: minutesLate }` applied at start of day. |
| caseMultiplier | Multiplies every store's cases. |
| callouts | Merchandiser ids out before the day starts. |
| openingAlert | `{ sev: "bad"\|"warn"\|"info", text }` shown at day start. |
| notes | For facilitators; not shown in the app. |

### lists.json

In-store task checklist, merchandiser issue types, and finding areas.

## Getting real data in

Most DSD systems can export a delivery manifest (store, ETA, cases) and an employee
roster. Convert to the shapes above — a small script in `scripts/` is the right place
for that converter when the time comes. Keep a copy of real exports **out of git** if
they contain anything sensitive.
