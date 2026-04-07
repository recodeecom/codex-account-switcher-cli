## MODIFIED Requirement: Billing page
The Billing page SHALL provide a business-plan seat management surface that shows billing cycle timing, per-seat pricing, assigned members, and computed monthly seat total.

#### Scenario: Billing cycle and base totals are visible
- **WHEN** a user opens `/billing`
- **THEN** the page displays the current cycle label and renewal date
- **AND** it shows ChatGPT seat pricing as `€26/month`
- **AND** it shows the current calculated monthly total for assigned ChatGPT seats

#### Scenario: Account-level seat list is accessible from each business account row
- **WHEN** a user views the business-account totals table on `/billing`
- **THEN** each row includes an `Accounts list` action with a `Watch` button
- **AND** clicking `Watch` opens an account-scoped list dialog
- **AND** the dialog shows member rows with `Name`, `Role`, `Seat type`, and `Date added` columns.

#### Scenario: Member seat actions update account seat usage
- **WHEN** a user opens the account-scoped list dialog from `Watch`
- **AND** uses row actions to change a member from `Codex` to `ChatGPT`
- **THEN** the member row seat type updates immediately
- **AND** the business-account row updates ChatGPT/Codex seat counts accordingly
- **AND** the total monthly ChatGPT cost updates immediately

#### Scenario: Removing a member updates account seat usage
- **WHEN** a user opens row actions for a member in the account-scoped list dialog
- **AND** chooses `Remove account`
- **THEN** that member row is removed from the dialog
- **AND** the business-account row updates ChatGPT/Codex seat counts accordingly.
