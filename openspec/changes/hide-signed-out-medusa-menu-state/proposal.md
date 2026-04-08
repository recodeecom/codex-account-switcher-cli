## Why
The account dropdown is cluttered when there is no Medusa admin session. Operators do not want to see a `Sign in Medusa admin` action there, and the signed-out footer copy (`Medusa admin / Not signed in`) adds noise.

## What Changes
- Remove the signed-out `Sign in Medusa admin` action from the account dropdown.
- Hide the `Medusa admin` footer row when no Medusa admin session exists.
- Hide the `Last Medusa admin login` footer row when there is no recorded Medusa admin login.
- Keep the signed-in Medusa admin state visible, including the `Sign out Medusa admin` action.

## Impact
- Simplifies the account dropdown for signed-out operators.
- Preserves Medusa session visibility only when it carries useful current or historical state.
