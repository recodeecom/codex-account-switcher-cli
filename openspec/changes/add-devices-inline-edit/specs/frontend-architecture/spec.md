### ADDED Requirement: Devices page supports editing existing entries
The Devices page SHALL allow operators to edit the saved `name` and `ipAddress` fields for an existing device entry without deleting and recreating it.

#### Scenario: User edits a saved device inline
- **WHEN** a user enters edit mode for a device row, changes name and/or IP, and saves
- **THEN** the frontend calls `PUT /api/devices/{deviceId}` with the updated `name` and `ipAddress`
- **AND** the updated entry is shown in the table after refresh

#### Scenario: User cancels inline edit
- **WHEN** a user enters edit mode for a device row and clicks cancel
- **THEN** no update API request is sent
- **AND** the row remains unchanged
