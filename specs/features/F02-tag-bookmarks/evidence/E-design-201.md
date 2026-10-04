### Evidence E-design-201

**SDLC activity:** design

**Task/feature:** F02-tag-bookmarks — low-level design (`lld.md`) and task breakdown (`tasks.md`)

**Context given to AI:** `spec.md` (approved, 13 AC, 8 edge cases), `constitution.md` v1.0.0, `hld.md` v2, `data-model.md` v3, `component-map.json` v1, F01's approved `lld.md`/shipped code (`bookmark-service.js`, `bookmark-repository.js`, `tag-repository.js`, `routes/tags.js`, `app-error.js`), F03's shipped `list-query.js`/`bookmarks.store.ts`/`bookmark-list.*`, `docs/mockup.html`'s tag-chip markup and `addTag()`/`drawChips()` script, and `app/web/src/styles.css`'s existing (F03) chip rules.

**Prompt/request:** `/design-feature F02-tag-bookmarks` — produce the LLD and task list; after the preview, "LD-01…LD-04 Accept Recommendation; gap 1 Accept Recommendation; gap 2 Accept Recommendation; gap 3 Confirmed", then "GO".

**AI response summary:** Found no architecture gap (the `tag`/`bookmark_tag` schema and indexes already exist exactly as F02 needs — no AMD). Presented four LD decisions (where tag normalize/validate/suggest logic lives; how the bookmark+tag-link write stays atomic; how one `GET /api/tags` route serves both the F02 autocomplete shape and the already-shipped F04-sidebar shape; whether the chip-input component injects the store directly or stays generic) plus three gaps (malformed `tags` shape, ASCII-only charset, confirming the shared-route branch), each with a recommended default. After the human's answers, generated `lld.md` (14 sections, 4 LD decisions + 3 confirmed gaps, no architecture impact) and `tasks.md` (12 tasks, F02-T01…T12, all 13 AC and all 8 edge cases covered), then ran the Step 6 validation checklist against both files.

**Your decision:** Accepted

**What you changed and why:** Nothing — accepted as-is.

**How you verified it:** Checklist inspection and a placeholder grep — no build/test run, since this is design-only. (In-session: confirmed the Step 6 checklist items by inspection — AC/EC-to-task coverage table in `tasks.md`; every `§3`/`tasks.md` file path checked against `component-map.json`'s `app/api`/`app/web` roots; a `grep_search` for template placeholders/GUIDE comments in both new files returned no matches. No command has been run against the generated design — `/build-feature F02-tag-bookmarks` has not started.)

**Outcome:** Worked — `lld.md` and `tasks.md` approved as generated, no rework needed.

**Iteration:** n/a — first design pass, not yet revised

**Approx. time:** 10 minutes

**Learning:** Reusing F01's transaction-boundary and repository-dependency pattern (LD-02) avoided adding a new orchestration layer for F02's tag writes.
