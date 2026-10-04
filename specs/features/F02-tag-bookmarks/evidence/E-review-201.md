### Evidence E-review-201

**SDLC activity:** review

**Task/feature:** F02-tag-bookmarks — `/review-phase F02-tag-bookmarks`

**Context given to AI:** `spec.md` (13 AC), `lld.md` (14 sections), `tasks.md` Build-Verify Log and Plan vs. Actual, `status.md`, `docs/03-build.md` and `docs/04-testing.md` F02 sections, `specs/architecture/component-map.json`, `specs/constitution.md`, the full `app/web/src/app/features/tag-input`, `app/web/src/app/features/bookmark-form`, `app/api/src/routes/tags.js`/`app/api/test/tags-route.test.js` source, and the live test output captured in this session (api: 364/364 tests; web: 116/116 tests at Testing gate).

**Prompt/request:** Review F02-tag-bookmarks per the reviewer mode (correctness vs AC, security, validation, maintainability, accessibility, defects); dev-1 then replied "Accept all but for RV04 amend the spec and make sure it is approved."

**AI response summary:** Raised five findings. **F02-RV01** (High) — `BookmarkForm.onSubmit()` only read `store.tags()` (already-committed chips), silently discarding any text typed into the tag input but not yet committed via Enter/comma — a silent data-loss bug and an undeclared deviation from `docs/mockup.html`'s submit handler, which explicitly flushes pending text. **F02-RV02** (Medium) — `TagInput.onInput()`'s datalist-selection detection used plain string equality against the suggestion list, which could false-positive when a user types through a shorter existing tag name en route to a longer one. **F02-RV03** (Medium) — the tag input's error message region had no `id` and the `<input>` lacked `aria-describedby`/`aria-invalid`, inconsistent with the URL/Title fields in the same form. **F02-RV04** (Low) — `spec.md` F02-AC11's example (`prefix=DA` → `["database","design"]`) is mathematically impossible against the documented/implemented plain-prefix-match algorithm ("design" does not start with "da"); flagged but left unfixed at the Build gate (F02-T05). **F02-RV05** (Info/cosmetic) — native `<datalist>` dropdown styling, already a known LLD-documented trade-off from the Build-gate keyboard walkthrough.

**Your decision:** Accepted (all five)

**What you changed and why:** dev-1's instruction: "Accpet all but for RV04 amend the spec and make sure it is approved" — all five findings accepted using each finding's suggested fix, with RV04 specifically handled by directly amending `specs/features/F02-tag-bookmarks/spec.md` (rather than leaving it flagged for a future `/amend-architecture` pass): F02-AC11's second example was corrected from `prefix=DA` → `["database","design"]` to `prefix=DOC` → `["docs"]`, and a Change Log row was added recording the correction and dev-1's same-day approval. RV01: added `TagInput.commitPendingText()` and called it from `BookmarkForm.onSubmit()` before building the payload. RV02: switched the datalist-pick detection to `(event as InputEvent).inputType === 'insertReplacementText'` combined with the suggestion-list membership check. RV03: added `id="tgerr"` to the error paragraph and `aria-describedby="tgerr"` / conditional `[attr.aria-invalid]` to the `<input>`. RV05: no code change — confirmed as an accepted, unfixable-via-CSS trade-off already documented in `lld.md` §6.

**How you verified it:** All fixes applied in one attempt each, with new/modified regression tests added to `tag-input.spec.ts` (RV01, RV02, RV03) and `bookmark-form.spec.ts` (RV01), plus a comment-only update to `app/api/test/tags-route.test.js` reflecting the RV04 correction. Full build-verify loop run after all changes:
- `npx vitest run` (in `app/api`) → **20 files passed (20), 364 tests passed (364)**, exit 0 — no regression (no functional api code changed).
- `npx ng test --watch=false` (in `app/web`) → **8 files passed (8), 121 tests passed (121)**, exit 0 (116 pre-existing + 5 new: 2 for RV01, 1 for RV02, 1 for RV03 in `tag-input.spec.ts`; 1 for RV01 in `bookmark-form.spec.ts`).
- `npx prettier --write .` and `npx eslint . --fix` in both `app/web` and `app/api` → clean, 0 errors.
- `npx ng build` (in `app/web`) → clean, `Application bundle generation complete` (6.128s), main 172.64 kB / styles 6.63 kB.

**Outcome:** Worked — all five findings verified fixed/accepted on the first attempt, with no regressions in either component's test suite, and the RV04 spec correction recorded as approved in `spec.md`'s own Change Log.

**Iteration:** Closed. `specs/features/F02-tag-bookmarks/tasks.md` F02-T13 Build-Verify Log and Plan vs. Actual updated with the observed results above. Returning to the reviewer for the Review gate Gate Summary.

**Approx. time:** TODO(human)

**Learning:** TODO(human)
