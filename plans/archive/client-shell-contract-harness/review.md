# Review

## Status

Pass

## Plan Conformance

Implemented the planned harness-only scope.

- Updated `scripts/check-contracts.mjs` to treat the `app/reading-manager-client.tsx` limit as a client shell budget, keep the hard `120_000` byte limit, add actionable extraction guidance, and require the expected budget and extraction guidance in the harness docs and feature-change skill.
- Updated `docs/development-harness.md` to describe the client shell budget and distinguish `lib/` logic extraction from focused `app/` UI extraction.
- Updated `.agents/skills/ewd-feature-change/SKILL.md` to align future feature work with the same client shell extraction policy.
- Updated the plan task checklists to reflect the completed implementation and verification work.
- Did not change `AGENTS.md`, runtime app behavior, Supabase schema, or the client component implementation itself.

## Findings

None.

## Verification Run

Passed.

Command:

```powershell
& 'C:\Program Files\nodejs\npm.cmd' run check:contracts
```

Result:

```text
> english-with-dad@0.1.0 check:contracts
> node scripts/check-contracts.mjs

Contract check passed
```

## Promotion Candidates

- Closed: the harness policy clarification now lives in `docs/development-harness.md`.
- No ADR is currently needed. The decision is a small harness policy clarification, not a hard-to-reverse architecture choice.
