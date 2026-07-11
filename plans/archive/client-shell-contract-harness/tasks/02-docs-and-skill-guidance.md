# Docs And Skill Guidance

## What to Build

Update the human and agent-facing guidance for future feature work.

In `docs/development-harness.md`, explain that the `reading-manager-client.tsx` size check is a client shell budget. The document should make clear that the preferred response to hitting the budget is responsibility extraction, not byte shaving.

In `.agents/skills/ewd-feature-change/SKILL.md`, align the feature-change workflow with the same rule:

- Prefer extracting pure functions before changing complex UI flows.
- Move reusable reading logic into `lib/`.
- Move cohesive UI surfaces into focused `app/` components.
- Keep `reading-manager-client.tsx` as the orchestration shell when practical.

## Acceptance Criteria

- [x] `docs/development-harness.md` describes the client shell budget.
- [x] `docs/development-harness.md` distinguishes `lib/` logic extraction from `app/` UI extraction.
- [x] `.agents/skills/ewd-feature-change/SKILL.md` gives the same extraction guidance.
- [x] `AGENTS.md` is not changed.
- [x] No runtime app behavior changes are made.

## Required Verification

```powershell
& 'C:\Program Files\nodejs\npm.cmd' run check:contracts
```

## Blocked By

None.
