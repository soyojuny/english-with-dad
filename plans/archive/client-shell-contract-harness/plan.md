# Client Shell Contract Harness Plan

## Goal

Improve the project harness around `app/reading-manager-client.tsx` growth without refactoring the client component yet.

The immediate outcome is a clearer contract: the client file size budget remains a final guardrail, while the docs and feature-change skill explain how future work should decide between extracting pure logic into `lib/` and extracting UI pieces into focused `app/` components.

## Context

`npm run check:contracts` runs `scripts/check-contracts.mjs`. Today that script checks many project contracts and ends with a hard byte-size limit for `app/reading-manager-client.tsx`.

The current byte limit is useful as a last-line warning, but it does not explain the architectural policy well. It can lead agents to reduce bytes locally instead of splitting responsibilities. The intended rule already exists in `AGENTS.md`: do not keep adding behavior to `app/reading-manager-client.tsx` when reusable logic can move to `lib/`.

## Decisions

- Keep this work limited to harness improvement.
- Do not split `app/reading-manager-client.tsx` in this plan.
- Keep the `120_000` byte limit as a hard failure.
- Treat that byte limit as a client shell budget, not as the primary design policy.
- Hard-fail only deterministic conditions that the script can check reliably.
- Do not add AST analysis, line-count analysis, or required extracted component names in this iteration.
- Update only:
  - `scripts/check-contracts.mjs`
  - `docs/development-harness.md`
  - `.agents/skills/ewd-feature-change/SKILL.md`
- Do not update `AGENTS.md` in this iteration because its current high-level rule is already sufficient.

## Out of Scope

- Refactoring `app/reading-manager-client.tsx`
- Adding `QrDialog`, `QuickLogDialog`, or view-level components
- Moving business logic into `lib/`
- Changing app runtime behavior
- Changing Supabase schema, migrations, RLS, or data mapping
- Adding broad static analysis for React component complexity

## Tasks

1. Update the contract check wording and deterministic doc checks.
2. Update harness documentation and feature-change skill guidance.
3. Run the required contract verification and record the result.

## Required Verification

```powershell
& 'C:\Program Files\nodejs\npm.cmd' run check:contracts
```

If PowerShell execution policy blocks `npm`, run the underlying script directly only as a diagnostic fallback:

```powershell
node scripts\check-contracts.mjs
```
