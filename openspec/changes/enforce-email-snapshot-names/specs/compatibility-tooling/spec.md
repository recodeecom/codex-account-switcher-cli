## ADDED Requirements

### Requirement: codex-auth inferred snapshot naming uses normalized email
When account name is omitted in `codex-auth login` or `codex-auth save`, inferred snapshot names SHALL use normalized email-shaped names.

#### Scenario: Inferred name from current auth email
- **WHEN** current auth email is `Codexina@EdixAI.com`
- **AND** operator runs `codex-auth login` without a name
- **THEN** inferred snapshot name is `codexina@edixai.com`.

### Requirement: codex-auth inferred duplicate naming is deterministic
If an inferred canonical email snapshot name is already occupied by a different identity, tooling SHALL allocate deterministic duplicate aliases.

#### Scenario: Canonical email name conflict
- **WHEN** `codexina@edixai.com.json` already exists for a different identity
- **THEN** inferred fallback name is `codexina@edixai.com--dup-2`
- **AND** further conflicts use incrementing `--dup-N` suffixes.
