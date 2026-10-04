---
name: ewd-register-assign
description: Review or register English With Dad books from cover photos, QR photos or supplied audio links, and assign one or two weeks using saved child routines through Supabase. Use for parent material and assignment requests; not app feature development.
---

# English With Dad 자료 등록·배정

Use this repo's [operating contract](../../../docs/ai-registration-assignment.md) and
[current routines](references/routines.json). Read them before processing a batch;
do not ask the parent to repeat the interview or reconstruct routines from chat memory.
This skill implements direct Supabase operations, without changing the app or schema.

## Request and inputs

The parent chooses the books, their order, child, purpose (읽기/정따/그림책), series
input value, start Sunday and one or two weeks. Accept ordered photos, local paths,
or an existing-book request. Process a selected child/purpose bundle or several
bundles together. Do not require handwritten titles, daily dates or counts.
Folders may communicate child/purpose/order, but their format is not yet fixed.
Do not infer order from filesystem enumeration: use the parent's order or clear
numeric filename ordering; ask only if ambiguous.

For an analysis/review request, inspect photos and owned data and report a proposed
registration/assignment plan without writing books or assignments. Distinguish
observed cover/page information from unverified full book or audio contents.
When the parent subsequently requests execution, carry forward the reviewed
inputs and apply their new links, dates and order. Reuse previously agreed scope;
book counts alone do not establish a child role, purpose or duration.

Registration alone is valid when requested. For registration plus assignment,
the request authorizes the specified new rows; do not add a blanket confirmation
step. Ask for missing inputs, uncertain recognition or overlapping assignments.
Do not choose books or a start date on the parent's behalf.

## Resolve photos and existing materials

- Inspect cover and QR images. Match using book numbers, normalizing leading zeros;
  do not use the common `English w. M 29` sticker as a series or identifier.
  A number matches photos, not the parent's chosen reading order.
- Preserve recognized information. Use the local `scripts/decode-qr.mjs` helper
  for original/reduced images and cropped, resized, thresholded retries. Read
  [photo processing](references/photo-processing.md) for its agent-written input
  and retry limits. Retain raw QR text; strip a `URL:` prefix and validate HTTP(S).
  Conflicting recognition needs review; after practical retries, request only the
  unresolved link. Photos without QR codes are missing inputs, not decoder failures.
- Accept parent-supplied HTTP(S) audio links, including YouTube, without requiring
  another QR photo. Preserve supplied URLs, including query parameters. Use the
  specified purpose for field placement; decoding a URL does not verify playback.
- For two QR codes, use adjacent labels and the parent's purpose to identify the
  fields. A single shared audio link may fill both reading and shadowing only when
  both activities are in the agreed plan and the link is confirmed to contain both.
  Link count or audio contents alone do not authorize adding a reading task.
  `getTaskAudioUrl()` has no missing-field fallback.
- Read `lib/reading-types.ts`, `lib/reading-data.ts`,
  `lib/supabase/reading-store.ts`, `lib/cover-image.ts` and applicable migrations.
  Use `compressCoverImage()` for a JPEG data URL (960px max, quality 0.72);
  preserve the source file. Do not invent a Storage bucket.
- Confirm the connected `english-with-dad` project and parent owner, querying only
  needed metadata. Look up documented parent names, app aliases and child IDs in
  the operating contract, then revalidate the child within that owner. Reuse an
  agreed routine for the requested scope; keep name/ID identity, the routine
  applied to a batch and confirmed first/second family roles distinct. Do not infer
  roles from creation order. Record confirmed mappings and routine agreements in
  the operating document rather than hardcoding family IDs in this skill.
- Search owned books by link and normalized title before inserting. Reuse a clear
  match; title alone, numbering alone or differing metadata can be ambiguous. Do not
  silently replace an existing book or alter its audio during an assignment request.
- Insert only missing `books` rows using `owner_user_id`, `active=true`,
  `content_type='book'`, confirmed series/title, compressed cover and recognized
  `audio_listen`/`audio_shadow`. Leave volume/level/note and unused links empty unless
  supplied. Recheck duplicates immediately before writing. Report uncertain matches.

## Generate and save assignments

1. Use `scripts/plan-assignments.mjs` to generate candidates from resolved IDs. The
   script does not access the DB. Read [its input format](references/schedule-input.md)
   when preparing the agent's temporary JSON; the parent need not write that file.
2. Compare candidate activities against the agreed routine and book-specific
   exceptions in the operating contract, applying the parent's latest instructions.
   Validate ownership and active book status, and require audio only for assigned tasks.
   Reading requires `audio_listen`, shadowing requires `audio_shadow`, self-reading
   needs none. Keep quiz enabled only where the current routine calls for it.
3. Immediately query existing assignments for each selected **child, activity
   category and full date range**, including different books. An upsert key only
   detects the same book; it does not resolve a conflicting weekly plan.
   Identical candidates already stored can be reused on a retry. Report other
   overlaps and let the parent choose keep or replace. Before a chosen replacement,
   inspect completions, audio launches and quiz results and establish the exact
   rows and existing records affected. Do not delete completion records implicitly.
4. Insert the authorized missing rows with the existing assignment shape:
   `owner_user_id`, `child_id`, `date`, `book_id`, `activity_category`, `tasks`,
   `task_counts`, `quiz_enabled`. Preserve the compound owner foreign keys.
   Do not blindly call the app's upsert, which can change an existing assignment.
   Guard against intervening overlaps within the write transaction. A unique-key
   collision is a reason to requery, not overwrite. Change no completed or unrelated rows.
   Before transporting cover-heavy batches, follow the large-payload guidance in
   [photo processing](references/photo-processing.md). Verify complete input before
   any write. New book IDs may be allocated locally to validate assignments before
   inserting both sets in one transaction; planned IDs are not persisted rows.
5. Requery the stored rows and compare every candidate's owner, child, date, book,
   category, tasks, counts and quiz. If a response fails or is unclear, requery
   before retrying and write only confirmed missing rows; stop and report if state
   remains unclear. Never replay a batch blindly.

Routine changes update `references/routines.json` and the operating document, then
rerun schedule tests. Apply them to new requests, not existing assignments.

## Verification and report

Check book metadata and cover against the supplied source. Check the generated
and persisted counts, weekdays, book switches and quiz settings. Confirm the
child's actual app list and audio launch when a login session is available;
otherwise ask the parent to verify those and explicitly label local UI checks.
Do not mark the live trial complete from mocked UI or database reads alone.

Report created/reused books, created/reused assignments, unresolved items, date
range and IDs. Preserve the batch order and summarize conflicts separately.
Keep durable agreements and trial progress in the operating document and the
active plan at `plans/active/ai-registration-assignment/` while that trial is open.
No API purchases, schema changes or Git publishing are implied by this skill.
