## 1. Implementation

- [x] 1.1 Add runtime version resolver utility for the status bar.
- [x] 1.2 Update status bar to prefer runtime-resolved version with compile-time fallback.
- [x] 1.3 Emit `version.json` from Vite build containing frontend package version.
- [x] 1.4 Add unit tests for runtime version resolution fallback behavior.

## 2. Verification

- [x] 2.1 Run `cd frontend && bun run test -- src/components/layout/app-version.test.ts`.
- [x] 2.2 Run `cd frontend && bun run typecheck`.
