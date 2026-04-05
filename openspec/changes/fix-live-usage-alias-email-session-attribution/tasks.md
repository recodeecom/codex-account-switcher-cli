## 1. Specification

- [x] 1.1 Add OpenSpec change for live usage alias email/session attribution alignment.

## 2. Backend implementation

- [x] 2.1 Remap `/live_usage` `account_emails` by snapshot alias map.
- [x] 2.2 Merge and dedupe remapped emails per effective snapshot row.
- [x] 2.3 Filter `<live_usage...>` and `<live_usage_mapping...>` payload echoes from task-preview mapping.

## 3. Validation

- [x] 3.1 Add unit coverage for alias-remapped `account_emails` output.
- [x] 3.2 Add unit coverage for live-usage XML payload preview suppression in task mapping.
- [x] 3.3 Run targeted health probe + codex live-usage unit tests.
- [x] 3.4 Run lint checks for changed Python files.
