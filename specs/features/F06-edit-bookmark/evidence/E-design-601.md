### Evidence E-design-601

**SDLC activity:** design

**Task/feature:** F06-edit-bookmark — produce the low-level design (`lld.md`) and task breakdown (`tasks.md`) for editing an existing bookmark, resolving the one open architecture risk (F06-RK1) carried forward from planning before finalizing the design.

**Context given to AI:** `specs/features/F06-edit-bookmark/spec.md` (approved, 13 AC, 6 edge cases, risk F06-RK1 and clarification C-F06-01 both flagging that `EDIT_CONFLICT` needs an `hld.md` §8 amendment); `specs/architecture/hld.md` v2, `data-model.md` v3, `component-map.json` v1; `specs/architecture/amendments/AMD-001-*.md` and `AMD-002-*.md` as precedent for raising and applying an amendment inline during feature work; sibling LLDs `specs/features/F01-add-bookmark/lld.md` and `F03-list-bookmark/lld.md` for structure and tone; `.github/templates/lld.template.md`; the existing `app/api` (`bookmark-repository.js`, `bookmark-service.js`, `routes/bookmarks.js`, `app-error.js`) and `app/web` (`bookmarks.store.ts`, `bookmark-form.*`, `bookmark-list.*`, `app.ts`/`app.html`, `core/*`) source; `docs/mockup.html`'s `openForm(b)` as the approved UX reference for edit-mode dialog reuse.

**Prompt/request:** Run `/design-feature F06-edit-bookmark` per `.github/prompts/design-feature.prompt.md`.

**AI response summary:** Presented five decisions as option tables with challenges — an architecture-impact question (raise+apply AMD-003 now vs. defer or solve only inside the feature) plus LD-01 (edit-conflict transport: body field `updatedAt`, exact-string match, fail-closed), LD-02 (self-exclusion duplicate lookup: new prepared statement), LD-03 (edit pre-fill source: reuse in-memory list data for the row-button trigger, enrich the shared `duplicateUrlError()` for the duplicate-banner trigger, no new `GET` route), and LD-04 (dialog reuse: extend the existing `BookmarkForm`/`BookmarksStore` with an `editing` slice rather than build a second dialog). After all five were accepted, drafted and applied `AMD-003-edit-conflict-error-code.md` (added `EDIT_CONFLICT` 409 to `hld.md` §8's error and trust-boundary tables, bumped `hld.md` to v3), then wrote the full 14-section `lld.md` and an 11-task `tasks.md`, and updated `status.md` to record the amendment and clear F06-RK1.

**Your decision:** Accepted

**What you changed and why:** TODO(human)

**How you verified it:** Checked the new `lld.md` against `design-feature.prompt.md`'s 11-item validation checklist (AC/edge-case-to-task mapping, ≥2 options per decision, component-map path resolution, data-model fidelity, contract completeness, exact validation messages, security clause citations, UI state coverage, sequence/contract match, task completeness and ordering, header version match) — all 11 passed. No command was run; no code exists yet for this feature.

**Outcome:** TODO(human)

**Iteration:** One round — all five decisions (Q1 architecture-impact + LD-01 through LD-04) were put together and accepted together ("Q1. Option A... Q2. Accepted A... Q3. Accepted A... Q4. Accepted A... Q5. Accepted A"); no option table was revised.

**Approx. time:** TODO(human)

**Learning:** TODO(human)
