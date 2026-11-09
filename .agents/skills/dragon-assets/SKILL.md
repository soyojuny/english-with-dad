---
name: dragon-assets
description: Create, inspect, edit, prepare, or organize dragon avatar images and animation sprite sheets. Use for visual asset production and review; app behavior, database changes, PWA caching, and deployment belong to the project's development skills.
---

# Dragon Avatar Assets

Treat the deliverable as an image or animation asset. Reviewing a sprite animation in a browser does not by itself make the task app UI development.

## Scope

- Work from the supplied images and the user's chosen appearance, frames, and motion. Inspect the existing files before proposing regeneration.
- Do not invoke `ewd-feature-change`, `ewd-ui-regression`, or `ewd-supabase-change` merely because these assets will eventually be used in English with Dad.
- Asset-only work does not require `plan:workflow`, app contract checks, TypeScript checks, a Next build, or database access.
- When the user asks to apply an approved asset to the app, use the relevant development skills for that integration: rendering and animation behavior, asset build entries, PWA cache entries, and persisted feature eligibility. Keep that implementation scope distinct from image production.

## Image Work

- For image generation or visual editing, follow the `imagegen` skill and image tool instructions. Preserve the supplied originals and the user's approved visual identity.
- Establish the output needed by its consumer: a single image or sprite sheet, its dimensions, frame order, transparency, and animation timing. Reuse established asset conventions when they fit.
- Do not assume generated sheets respect equal cell boundaries. Inspect the actual silhouettes before cutting so wings, tails, and faces remain intact.
- For animation, check character consistency, scale and anchor stability, frame order, loop continuity, and transitions such as takeoff to flight. Distinguish pose changes inside the image from movement of the character on screen.
- Check alpha and edge halos against light and dark backgrounds. Validate dimensions and visible margins directly; do not substitute app tests for visual inspection.

## Minimal Deliverables

- Persist the final asset files needed by the consumer. Keep intermediate crops, individual frames, and composites in memory or temporary storage unless they are the requested deliverable.
- When the user needs to choose or review motion, provide one useful preview. Do not also export desktop/mobile screenshots, contact sheets, duplicate sheets, or a parallel set of frames as routine evidence.
- Inspect a preview without saving extra screenshots by default. Save a diagnostic image only when needed to resolve a specific visual problem or requested by the user.
- Once approved, keep one canonical source under `assets/dragons/source/` with only the provenance needed to identify its inputs and selected frames. Read `assets/dragons/README.md` for the existing source layout. Deployment WebP files belong to the app integration step.
- Remove redundant generated review files when that cleanup is authorized. Preserve provided originals and historical archives unless their removal is requested. Do not create another image archive as a side effect of cleanup.

Report the final asset location, selected motion or frames, what was visually checked, and any remaining image defects. Do not describe an asset as deployed merely because its images are ready.
