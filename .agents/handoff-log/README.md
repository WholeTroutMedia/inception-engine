# Handoff Log Placeholder

This directory contains an append-only log of every HANDOFF.md state transition.

Each transition is stored as a timestamped JSON file: `[ISO-timestamp].json`

Written by the `HandoffService` in `packages/memory` whenever `writeHandoff()` is called.
