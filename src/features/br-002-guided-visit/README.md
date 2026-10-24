# br-002-guided-visit

**Requirements:** BR-002 Merchandising visit execution (MVP feedback), BR-015 Guided
single-app workflow, BR-021 Visit standards (see docs/requirements.md)
**Status:** on by default. Covers T-201 and T-205.

## What it does
The phone walks the merchandiser through the visit in the order the business asked
for:

1. **Backstock**: note backstock (cases in the backroom, possible while waiting on
   the truck) and check in the delivery
2. **Displays**: from `br-022-display-awareness`
3. **Aisles**: one step per aisle at that store (fill, rotate, face)
4. **Validate**: validate the set
5. **Out-of-stocks**: from `br-020-oos-root-cause`

**Close out** stays disabled until every required step is done. A **Next** card at
the top of the phone always says the one thing to do now (drive, wait, the next
step, close out).

### War-game mechanics
- **"I'm playing this merchandiser"** (on the phone): the visit stays open past the
  standard time until the player closes out, so their real speed becomes the labor
  time. Closing early ends the visit early and pulls the rest of the day in.
- Everyone else is **simulated**: when their planned work time ends, the remaining
  steps are answered automatically (marked "auto").

### Practice visit (sandbox)
Below the phone, **Practice a store visit** opens any store's visit with every step
unlocked, so you can click through without running the clock. This is for training,
demos and walking the business through the flow. It works on a copy of the day:
nothing is saved back, and other features still react inside the copy (the
out-of-stock routing shows under *What would have been sent*). **Restart** and
**Exit** are on the card.

## War-game check
Hand a merchandiser the phone, tick "I'm playing", and let them run a store. Watch
the Supervisor's *Store visits* panel and the timeline react to how long it takes.

## Where things live
- `aisles.json`: aisles per chain.
- `engine.ts`: base steps, auto-complete, close-out, play/hold, practice sandbox
  (`startPractice`, `practiceCloseOut`; pure, tested).
- `ui.ts`: generic step inputs (check / count / counts / choice / entries + photo), the Next
  card, and the Supervisor panel. Steps from other features render here
  automatically through the core `visitSteps` plug-in.

## Decisions
- Steps and answers are core concepts (`store.answers`, `src/engine/visit.ts`) so
  displays, out-of-stocks and photos can each live in their own folder.
- Photos are kept in browser memory only (not saved or uploaded).

## Open questions
- Does every step need a photo? (Configurable in `br-039-photo-capture`.)
- What else, besides displays and invoicing/inventory, does the merchandiser own in-store?
