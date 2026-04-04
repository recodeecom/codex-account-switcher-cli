## Why

Concurrent account activity in `~/.codex/sessions` can produce mixed default-session telemetry. The current fallback attribution path can under-report active accounts in `Working now` and `codexSessionCount` when 3–8 accounts are active at the same time.

## What Changes

- Replace per-sample greedy ambiguity handling with a deterministic global assignment pass across active samples and candidate accounts.
- Keep unique reset-fingerprint matches as hard-priority anchors.
- Add a recall-biased fallback for unresolved samples so live/session signals are retained (presence + count), even when quota attribution is ambiguous.
- Preserve quota safety: only apply primary/secondary usage-window overrides when reset fingerprints are uniquely attributable.
- Keep API schema unchanged; only refine mixed-session semantics.

## Impact

- `codexAuth.hasLiveSession` and `codexSessionCount` remain more reliable under multi-account contention.
- Live-session detection favors recall, reducing false negatives for active accounts.
- Quota bars remain conservative and safe under ambiguous attribution.
