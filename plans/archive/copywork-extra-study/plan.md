# Copywork Extra Study

## Goal

Add copywork as an assignable Extra Study task for regular books. A child completes copywork by pressing a completion button, without opening audio or any external link, and the activity report records the book title, "필사 1회", and 5 minutes per completion.

## Context

The current assignment model separates parent-facing Activity Categories from concrete child Tasks. Extra Study already exists as an Activity Category and currently contains word reading for word reading materials. Copywork should extend the existing Task model rather than introduce a new material type, manual log type, or activity category.

## Decisions

- Copywork is a Task with internal value `copywork` and user-facing label `필사`.
- Copywork belongs to the existing `extraStudy` Activity Category.
- Copywork applies only to regular books (`contentType = book`), not word reading materials.
- The app will not introduce a separate "copywork book" material type, filter, or display grouping.
- For regular books, choosing `extraStudy` exposes only copywork count controls.
- For word reading materials, `extraStudy` continues to expose only word reading.
- Copywork uses no audio or link launch flow.
- One copywork completion records 5 minutes.
- Copywork uses the existing assignment count range of 0 to 3, with a practical default of 1 when Extra Study is selected.
- Activity records show the regular book title and task summary such as `필사 1회`, with the 5-minute completion included in totals.
- Existing assignment editing should allow changing the copywork count only; changing an assignment's Activity Category remains out of scope.
- Copywork assignments should not expose quiz Y/N and should save with quiz disabled.
- Supabase constraints must accept `copywork` in assignment tasks, task counts, completions, and audio launch task type unions, even though copywork should not create audio launch rows.

## Out of Scope

- Creating a separate copywork material type.
- Separating copywork books from other regular books in lists or reports.
- Free-form copywork notes, page ranges, text capture, or proof upload.
- Timers or custom minute entry for copywork.
- Changing existing assignments from one Activity Category to another in the edit form.
- Changing manual activity log categories.

## Tasks

- [01 - Domain and data contract](tasks/01-domain-and-data-contract.md)
- [02 - Assignment and completion UI](tasks/02-assignment-and-completion-ui.md)

## Required Verification

- `npm run check:contracts`
- `npm run typecheck`
- `npm run build` if the UI changes touch broad app rendering paths

## ADR Decision

No ADR is needed. This is an extension of the existing Activity Category and Task model rather than a hard-to-reverse architecture decision.
