# Plans Harness

Plans are the working contracts for agent-led changes. Keep long-lived architecture
documents in `docs/`; use `plans/` for active work, implementation tasks, review
records, and temporary decision context.

## Structure

```text
plans/
  active/
    <slug>/
      plan.md
      review.md
      tasks/
        01-*.md
      research.md
      adr/
        0001-*.md
  archive/
```

Only `plan.md`, `review.md`, and `tasks/` are required for a real plan. Add
`research.md` and `adr/` only when the work needs them.

## Flow

1. Use `grill-with-docs` to clarify the idea before implementation.
2. Capture the agreed contract in `plan.md`.
3. Break the work into vertical-slice task files under `tasks/`.
4. Let the coding agent implement against `plan.md` and the selected task.
5. Let the verification agent run the plan-aware `code-review` skill against
   the diff, using `plan.md` and `tasks/` as the spec source. Record findings
   and promotion candidates in `review.md`.
6. Promote durable knowledge before archiving:
   - Domain terms go to `docs/CONTEXT.md`.
   - Long-lived architecture decisions go to `docs/adr/`.
   - Harness and operating rules go to `AGENTS.md` or `docs/development-harness.md`.
7. Move the plan to `plans/archive/` only after verification passes and promotion
   candidates are closed.
8. Use `npm run plan:archive -- "<slug>"` to archive the plan instead of moving files manually.

## `plan.md`

```md
# <Plan Title>

## Goal

## Context

## Decisions

## Out of Scope

## Tasks

## Required Verification
```

## `tasks/NN-slug.md`

```md
# <Task Title>

## What to Build

## Acceptance Criteria

- [ ] ...

## Required Verification

## Blocked By
```

## `review.md`

```md
# Review

## Status

Pending | Passed | Failed

## Plan Conformance

## Findings

## Verification Run

## Promotion Candidates
```
