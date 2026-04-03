## Why
Operators can currently add and delete saved devices but cannot correct typos or update an IP address when a host changes. This forces delete-and-recreate workflows that are slower and easier to misapply.

## What Changes
- Add backend support to update an existing saved device by id.
- Add inline row editing on the Devices page for both device name and IP address.
- Keep existing validation and conflict semantics (`invalid_device_name`, `invalid_ip`, `device_name_exists`, `device_ip_exists`, `device_not_found`).
- Extend frontend and backend tests for edit flows.

## Impact
- Improves operator ergonomics by allowing in-place corrections.
- Preserves existing add/copy/delete behavior.
- Does not require database schema changes.
