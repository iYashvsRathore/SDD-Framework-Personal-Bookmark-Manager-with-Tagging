### Evidence E-build-202

**SDLC activity:** build

**Task/feature:** F02-T08 — `TagInput` component and its test suite (`tag-input.spec.ts`), F02-AC10, AC12, AC13

**Context given to AI:** `tasks.md`'s F02-T08 row (labelled input, chip row before input, Enter/comma commit, Backspace-on-empty removal, per-chip `aria-label`, `<datalist>` suggestions, debounced fetch on input + immediate fetch on focus), `BookmarksStore`'s F02-T07 API (`addTagChip`, `addTagsFromText`, `removeTagChip`, `removeLastTagChip`, `loadTagSuggestions`), and the established `BookmarkForm`/`BookmarkList` pattern of injecting the store directly plus `HttpClientTestingModule`-style `provideHttpClientTesting()` in specs.

**Prompt/request:** Implement F02-T08 (`tag-input.ts`, `tag-input.html`, `tag-input.spec.ts`) and run its build-verify loop.

**AI response summary:** First test run: 8 of 11 tests failed. Root cause: a Backspace-removal test called `tagInput().focus()` to set focus state, which triggered the component's real `(focus)="onFocus()"` binding and issued an actual `GET /api/tags?prefix=` request that was never flushed; `afterEach(() => http.verify())` then failed with "Expected no open requests", and every subsequent test in the file failed with "Cannot configure the test module when the test module has already been instantiated" because the poisoned `TestBed` never tore down cleanly. Fix: added `http.expectOne('/api/tags?prefix=').flush([])` immediately after the `.focus()` call, and introduced a `setValue()` helper (sets `.value` without dispatching `input`) alongside the existing `type()` helper so keydown-only tests do not accidentally trigger the debounced suggestion-fetch path.

**Your decision:** Accepted

**What you changed and why:** Nothing — accepted as-is.

**How you verified it:** In-session: `npx ng test` (single spec) — 11/11 passed after the fix; `npx ng test --watch=false` (full suite) — 8 files, 114/114 passed; `npx ng build` — clean, `Application bundle generation complete`.

**Outcome:** Worked — all 11 `TagInput` tests pass and the full web suite has no regressions.

**Iteration:** Attempt 1 (8/11 failed) → attempt 2, after the fix (11/11 passed, then full-suite 114/114 confirmed)

**Approx. time:** Part of ~30–45 minutes spent across the whole F02 build session (not separately tracked per task).

**Learning:** A component with a real DOM event binding (`(focus)`) will still fire that binding when a test calls `.focus()` for an unrelated reason (here, testing Backspace); any such test must explicitly account for the binding's side effects (here, flushing the HTTP request it triggers) or it will silently poison every later test in the same file via a broken `TestBed` teardown.
