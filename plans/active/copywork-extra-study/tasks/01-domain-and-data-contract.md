# Domain and Data Contract

## What to Build

Extend the reading assignment data contract so `copywork` is a valid Task under Extra Study for regular books, while preserving word reading behavior for word reading materials.

## Acceptance Criteria

- [ ] `TaskType` includes `copywork`.
- [ ] `taskDefinitions.copywork` has label `필사`, 5 minutes, and no audio requirement.
- [ ] Task ordering includes copywork after the existing reading tasks and word reading in a predictable order.
- [ ] Extra Study task availability is material-aware: regular books get copywork, word reading materials get word reading.
- [ ] `getTaskAudioUrl` returns no URL for copywork.
- [ ] Activity log generation records copywork completions with the book title, task label, count, and minutes.
- [ ] Tests cover copywork defaults, formatting, and activity log behavior.
- [ ] Supabase migration adds `copywork` to relevant task constraints and task count validation.

## Required Verification

- `npm run check:contracts`
- `npm run typecheck`

## Blocked By

None.
