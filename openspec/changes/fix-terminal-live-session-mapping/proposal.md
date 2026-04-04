## Why

Dashboard account cards currently blur two different signals:

- **live Codex terminal activity** (what is running now), and
- **tracked sticky-session history** (what has been seen in routing state).

That coupling can keep `Working now` and `Codex CLI sessions` elevated from sticky residue even when no live terminal process is running.

## What Changes

- Split session metrics into explicit live-vs-tracked fields in `AccountSummary`.
- Drive `Working now`, fast polling, and the primary account-card session number from **live process-mapped telemetry**.
- Keep sticky-session aggregation as **tracked inventory** for Sessions workflow visibility.
- Preserve `codexSessionCount` short-term as a compatibility alias to the new live count.
- Add a 5-minute staleness window for non-process live fallback signals while treating running process presence as immediate truth.

## Expected Outcome

- Dashboard status reflects true live terminal usage instead of sticky-session residue.
- Users still retain tracked/history visibility and Sessions-page access for residue/inventory flows.
- API payloads clearly expose live and tracked counters during migration.
