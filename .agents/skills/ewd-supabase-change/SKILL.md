---
name: ewd-supabase-change
description: Use for any English with Dad task involving Supabase Auth, Postgres schema, migrations, RLS, Storage, supabase-js, @supabase/ssr, reading-store mappings, or user data security.
---

# English With Dad Supabase Change

Use this workflow for database, auth, and persisted data changes.

## 1. Confirm The Data Model

- Read `lib/reading-types.ts`, `lib/reading-data.ts`, `lib/supabase/reading-store.ts`, and relevant files in `supabase/migrations/`.
- Preserve the `owner_user_id` family data boundary.
- New public tables must have RLS enabled and policies that match the access model.
- Client code must use publishable keys only. Never place service-role or secret keys in `NEXT_PUBLIC_*` variables.

## 2. Migration Rules

- Update migrations and app mappings together.
- When adding a table or column, update TypeScript row types, mapper functions, select lists, inserts/updates, docs, and contract checks as needed.
- Keep constraints aligned with TypeScript unions such as `TaskType`, `ManualLogType`, and `ActivityCategory`.
- For Storage, define bucket policy, URL strategy, and replacement/upsert behavior before changing UI.

## 3. Security Checklist

- Verify RLS is enabled on exposed `public` tables.
- Verify policies use `auth.uid() = owner_user_id` or the documented equivalent.
- Verify updates can select the row they update.
- Avoid security-definer functions in exposed schemas unless there is a specific reviewed reason.
- Do not rely on user-editable metadata for authorization decisions.

## 4. Verification

Run:

```powershell
npm run check:contracts
npm run typecheck
npm run build
```

When Supabase CLI or MCP access is available, also verify migrations against a database and run advisors before merging schema work.
