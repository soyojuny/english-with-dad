# Contract Check Guidance

## What to Build

Update `scripts/check-contracts.mjs` so the `reading-manager-client.tsx` size check communicates the actual policy.

Keep the existing `120_000` byte limit, but make the code and failure output describe it as a client shell budget. The failure should tell the next agent where responsibilities should move:

- Pure domain or calculation logic belongs in `lib/`.
- UI sections and dialogs belong in focused `app/` components.
- The budget is a final guardrail, not a request to shave bytes locally.

Also add deterministic `requireIncludes` checks that confirm the long-lived documentation and feature-change skill mention the client shell budget and extraction policy.

## Acceptance Criteria

- [x] The hard byte limit remains `120_000`.
- [x] The budget constant name communicates client shell responsibility, not generic file size.
- [x] The failure message gives actionable extraction guidance.
- [x] The script checks for the key harness wording in `docs/development-harness.md`.
- [x] The script checks for the key feature-change guidance in `.agents/skills/ewd-feature-change/SKILL.md`.
- [x] The script does not enforce specific extracted component names.
- [x] The script does not add AST or line-count complexity checks.

## Required Verification

```powershell
& 'C:\Program Files\nodejs\npm.cmd' run check:contracts
```

## Blocked By

None.
