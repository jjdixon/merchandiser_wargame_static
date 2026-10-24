# findings

**Requirements:** none — this is the war game's output, not a business requirement.
**Status:** locked on.

## What it does
The floating *This won't work because…* button and form (auto-attaches the screen,
merchandiser, sim time and scenario), and the *Findings* tab with copy-as-text,
copy-as-Markdown (for `docs/backlog.md`) and clear.

## Where things live
- `ui.ts` — the tab, its actions, and `mountFindings()` which adds the button and form.
- `storage.ts` — localStorage read/write and export formats (the only browser-storage
  code in the app).
- `areas.json` — the list of areas a finding can be filed under.

## Decisions
- Browser-only storage (D-004). Moving to shared storage would change only
  `storage.ts`.
