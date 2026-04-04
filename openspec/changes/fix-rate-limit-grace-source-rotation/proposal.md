## Why

Some accounts (for example `codexina`) keep reappearing as active after hitting a 5h usage limit because rollout telemetry source names rotate between polls. The grace fingerprint treated each rotated source name as a new session, which restarted the 60-second age-out window.

Operators also need stale rate-limited cards to stop showing an old `Current task` preview after the grace window has already expired.

## What Changes

- Stabilize usage-limit grace fingerprinting so rotated rollout source identifiers do not reset the same stuck session timer.
- Keep the 60-second grace timer tied to stable session identity (snapshot + counters + task preview), not volatile file names.
- Hide `Current task` preview on dashboard cards once a rate-limit grace window has expired.

## Impact

- Rate-limited sessions age out from `Working now` consistently after 60 seconds, including for rotating-source snapshots such as `codexina`.
- Dashboard cards avoid showing stale task text for already-aged-out limit-hit sessions.
