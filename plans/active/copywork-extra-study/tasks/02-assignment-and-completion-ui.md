# Assignment and Completion UI

## What to Build

Update the parent assignment flow and child completion flow so regular books can be assigned as Extra Study copywork, and children can complete copywork with a direct completion button.

## Acceptance Criteria

- [ ] Regular books offer `기타학습` as an Activity Category option.
- [ ] When a regular book's Activity Category is `기타학습`, only the `필사` count control is shown.
- [ ] When a regular book's Activity Category is not `기타학습`, copywork controls are not shown.
- [ ] Word reading materials continue to show only Extra Study word reading behavior.
- [ ] Copywork assignment creation defaults to 1 completion and allows 0 to 3 completions.
- [ ] Copywork assignments save with `quizEnabled = false` and do not show quiz controls.
- [ ] Existing assignment editing allows changing copywork count only.
- [ ] Child task view shows no audio or link button for copywork.
- [ ] Child task view shows the existing direct completion button and completed state for copywork.
- [ ] Parent activity report shows copywork under 기타학습 with the book title, `필사 1회`, and 5 minutes counted.

## Required Verification

- `npm run check:contracts`
- `npm run typecheck`
- `npm run build`

## Blocked By

- Task 01 data contract changes.
