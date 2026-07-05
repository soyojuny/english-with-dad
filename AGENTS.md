# AGENTS.md

## Project Shape

- This is a Korean-language Next.js App Router PWA for parent-managed child reading assignments.
- Runtime stack: Next.js 15, React 19, TypeScript, Supabase Auth, Supabase Postgres, PWA manifest/service worker.
- Main tracked app files live under `app/`, `lib/`, `public/`, `scripts/`, `supabase/`, and `docs/`.
- Root `app.js`, `index.html`, `manifest.webmanifest`, and `sw.js` are ignored legacy/local artifacts. Do not treat them as the production app unless the user explicitly asks.

## Change Rules

- Keep edits limited to the user's explicit request. If a broader or adjacent change seems necessary, ask the user for confirmation before making it.
- If the user's request is ambiguous, ask concrete clarification questions before editing.
- Keep user-facing Korean text valid UTF-8. Prefer `rg` for reading/searching Korean text in PowerShell because default `Get-Content` output can display mojibake.
- Do not keep adding behavior to `app/reading-manager-client.tsx` when reusable logic can move to `lib/`.
- `lib/reading-types.ts` and `lib/reading-data.ts` define the app data contract. Update them together with UI, Supabase mapping, migrations, and docs when the domain model changes.
- For Supabase work, preserve the `owner_user_id` access model, RLS, and per-user data isolation. Never expose service-role or secret keys to client code.
- For PWA work, update `public/manifest.webmanifest`, `public/sw.js`, and `scripts/check-pwa.mjs` together when cached assets or install behavior changes.
- Avoid destructive Git or filesystem actions unless the user explicitly asks for them.

## Verification

- Preferred full check: `npm run verify`.
- In this Windows/NVM workspace, if `npm` is not on PATH, run `C:\nvm4w\nodejs\npm.cmd run verify`.
- Individual checks: `npm run check:contracts`, `npm run check:sw`, `npm run check:pwa`, `npm run typecheck`, `npm run build`.
- Run the narrowest relevant check after small edits, and run `npm run verify` before declaring a broader feature complete.

## AI Workflow

- For planning, use `npm run plan:workflow -- "<user request>"` to get script-generated scope warnings, skill hints, and recommended checks before deciding manually.
- For substantial planned work, use `grill-with-docs` first and capture the agreed working contract under `plans/active/<slug>/` before implementation.
- Active plans use `plan.md`, `review.md`, and `tasks/` as the required shape. Promote durable knowledge to `docs/` before moving a plan to `plans/archive/`.
- Use `.agents/skills/ewd-git-publish` and the `npm run git:*` wrappers for repeated git status, commit, push, and publish operations.
- This project commits and pushes directly to `main`/`origin/main` by default. Do not create a feature branch for normal work unless the user explicitly asks.
- Use `.agents/skills/ewd-feature-change` for normal feature changes.
- Use `.agents/skills/ewd-supabase-change` for any Auth, database, migration, RLS, or Storage task.
- Use `.agents/skills/ewd-ui-regression` for PWA, mobile, QR, audio-launch, or visual regression work.
- Use subagents only when explicitly requested or when the user asks for parallel review/exploration. Good splits are security/RLS, UI regression, and test gaps.
