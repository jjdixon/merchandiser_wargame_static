# br-039-photo-capture

**Requirements:** BR-039 Photo capture, geolocation and image recognition (see docs/requirements.md)
**Status:** on by default. Covers T-204. Central photo review is BR-043 (M5).

## What it does
- **Photo policy** (an open business question, so it's switchable under *Pay & labor
  rules → Photos*):
  - display steps: photo **required** (default) or optional
  - validate the set: photo optional (default) or required
- On the phone, a photo button on those steps opens the camera (or file picker).
  Photos stay in browser memory only.
- Every photo is recorded with store, step, merchandiser, sim time and location.
- A **simulated recognition suggestion** (product group, display type, compliance,
  confidence) is attached. A supervisor confirms it or marks it wrong. That's the
  review loop the business would need before trusting real recognition.
- Simulated merchandisers attach "simulated" photos where one is required.

## Where things live
- `engine.ts`: `adjustStep` photo policy (applies to any feature's steps by phase),
  photo records, `suggest()` (pure, tested).
- `ui.ts`: Supervisor *Photos* panel with confirm / wrong.

## Open questions
- Which steps truly need a photo?
- Accuracy threshold, human review and correction process for real recognition.
