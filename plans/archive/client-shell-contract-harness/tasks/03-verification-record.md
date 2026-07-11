# Verification Record

## What to Build

Run the required verification after the harness implementation tasks are complete and record the result in `review.md`.

This task exists so the implementation phase has an explicit closeout step.

## Acceptance Criteria

- [x] `check:contracts` has been run with the project npm command.
- [x] The exact command and result are recorded in `review.md`.
- [x] Any failure is recorded with the failing contract and the next required fix.
- [x] No broader verification is claimed unless it was actually run.

## Required Verification

```powershell
& 'C:\Program Files\nodejs\npm.cmd' run check:contracts
```

## Blocked By

- Task 01
- Task 02
