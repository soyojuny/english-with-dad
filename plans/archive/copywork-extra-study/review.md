# Review

## Status

Complete

## Plan Conformance

Implemented as planned. Copywork is an Extra Study task for regular books, word reading materials keep their existing Extra Study word reading behavior, copywork completions do not open audio or external links, and activity reports count `필사 1회` as 5 minutes.

## Findings

- Code review raised one low-risk issue: empty-task Extra Study edit fallback could expose both word reading and copywork. Fixed by making `getEditableTasksForAssignment()` material-aware when a book is available.

## Verification Run

- `npm run verify` passed after implementation.
- `npm run verify` passed again after the edit fallback review fix.
- Published implementation commit: `df1357c Add copywork extra study task`.

## Promotion Candidates

- Closed: domain glossary entries for Copywork and Extra Study are in `docs/CONTEXT.md`.
- No ADR promoted. The plan recorded that this extends the existing Activity Category and Task model rather than introducing a hard-to-reverse architectural decision.
