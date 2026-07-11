---
name: ewd-feature-change
description: Use for normal English with Dad feature work, refactors, bug fixes, or behavior changes that touch app UI, reading assignment flow, completion logic, or shared reading data logic.
---

# English With Dad Feature Change

Follow this workflow for app behavior changes.

## 1. Find The Contract First

- Read `AGENTS.md` and the files directly related to the requested behavior.
- Treat `lib/reading-types.ts` and `lib/reading-data.ts` as the domain contract.
- If the change touches persisted data, switch to `ewd-supabase-change`.
- If the change affects mobile layout, QR, audio launch, service worker, or PWA install behavior, also use `ewd-ui-regression`.

## 2. Keep The Blast Radius Small

- Do not add more unrelated state or helpers to `app/reading-manager-client.tsx` when logic can be moved into `lib/`.
- Treat the `120_000` byte limit as a client shell budget.
- Keep `app/reading-manager-client.tsx` as an orchestration shell when practical.
- Prefer extracting pure functions before changing complex UI flows.
- Move reusable reading logic into `lib/`.
- Move cohesive UI surfaces and dialogs into focused `app/` components.
- The budget is a final guardrail, not a request to shave bytes locally.
- Preserve Korean user-facing copy and keep text UTF-8.
- Do not edit ignored root legacy files such as `app.js` or `index.html`.

## 3. Update The Harness

- Add or update deterministic checks when changing a contract that could regress silently.
- Keep `docs/development-harness.md` current if the verification workflow changes.
- Keep README and Supabase docs current when user setup changes.

## 4. Verify

Run the narrowest useful checks first:

```powershell
npm run check:contracts
npm run typecheck
```

For broad changes, finish with:

```powershell
npm run verify
```

If `npm` is not on PATH in this workspace, use:

```powershell
C:\nvm4w\nodejs\npm.cmd run verify
```
