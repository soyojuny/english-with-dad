---
name: ewd-ui-regression
description: Use for English with Dad UI, mobile PWA, visual layout, service worker, manifest, QR scan, camera/file upload, Naver audio launch, or browser regression work.
---

# English With Dad UI Regression

Use this workflow for UI and PWA-sensitive work.

## 1. Protect Core User Flows

Check the flows that matter most:

- Parent Google login and signed-in shell rendering.
- Child profile selection and today's assignment list.
- Opening reading/shadowing audio links and recording return time.
- Marking repeated task completions.
- Book cover upload, QR link input, and URL validation.
- Assignment creation by date range and activity category.
- Parent activity table and series progress views.

## 2. PWA Contract

- Keep `public/manifest.webmanifest`, `public/sw.js`, and `scripts/check-pwa.mjs` aligned.
- When service worker cache targets change, add/remove the actual files under `public/`.
- Preserve navigation fallback behavior for offline app shell access.

## 3. Layout Rules

- Design for mobile first because this is a parent/child PWA.
- Avoid text overlap in compact cards, buttons, dialogs, and table-like views.
- Keep Korean labels readable; do not replace domain terms such as `정따`, `흘려듣기`, or `영어 그림책` with generic English labels.

## 4. Verification

Minimum checks:

```powershell
npm run check:pwa
npm run typecheck
```

For meaningful UI changes, run a browser smoke check against the local app. If a dev server is needed:

```powershell
npm run dev
```

Then verify desktop and mobile widths, especially QR dialog, child task cards, book management, and assignment creation.
