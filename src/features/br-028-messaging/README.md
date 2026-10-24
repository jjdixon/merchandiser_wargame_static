# br-028-messaging

**Requirements:** BR-028 Operational messaging and escalation (see docs/requirements.md)
**Status:** on by default. Covers T-304. In production this may be the enterprise
chat or email tool instead; the prototype tests *what* needs saying, *to whom*, and
the link to the stop.

## What it does
- **Messages tab** (everyone can see it, filtered to the stores they can see):
  send to MSL / Scheduler / Driver / Merchandiser, about a store or "General".
  Messages are sent as the current *Viewing as* role.
- **Phone:** a compact thread for the merchandiser's stops, with the current stop
  pre-selected.
- **Driver updates:** when a truck slips, the driver posts the new ETA to that
  store's merchandiser automatically.
- **Simulated replies:** a message gets a canned reply from the recipient role about
  4 sim-minutes later (`replies.json`), so one player still gets a conversation.

## Where things live
- `engine.ts`: messages, `send`, driver updates, replies, visibility (pure, tested).
- `replies.json`: canned replies by role. Edit freely.
- `ui.ts`: Messages tab, phone thread, compose forms.

## Open questions
- Preferred channel (in-app vs enterprise chat/email) and retention policy.
