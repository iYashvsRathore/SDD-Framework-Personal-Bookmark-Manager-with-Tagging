### Evidence E-build-508

**SDLC activity:** build

**Task/feature:** F05-T08 — new `SearchBox` component (`web`): `#q`/`#qx` markup, 250 ms debounce calling `store.setSearchText()`, immediate `hasText` signal for `#qx`'s visibility, click-to-clear (F05-AC12, AC13)

**Context given to AI:** `lld.md` §2, §11 (LD-04); `tasks.md` F05-T08's row; `TagInput`'s shipped component/spec as the debounce-pattern precedent (`SUGGESTION_DEBOUNCE_MS`, `debounceHandle`, fake-timer test shape); `docs/mockup.html`'s `.search` markup (`#q`/`#qx`, the `sr`-class visually-hidden label, the icon spans) and its `$('#qx').onclick` handler; `app.html`'s existing `[attr.d]="icons.X"` single-path-per-icon rendering convention; the now-complete `bookmarks.store.ts` `setSearchText`/`clearSearch` methods from F05-T07

**Prompt/request:** Implement F05-T08 per the task brief: a standalone `SearchBox` component with a local `hasText` signal driving `#qx`'s immediate show/hide, a 250 ms debounce before calling `store.setSearchText()`, and a clear handler that cancels the debounce, empties the native input, calls `store.clearSearch()`, and returns focus to `#q`

**AI response summary:** Created `search-box.ts` (debounce via `setTimeout`/`clearTimeout` mirroring `TagInput`), `search-box.html` (ported `#q`/`#qx` markup, visually-hidden label, decorative icon spans using `icons.search`/`icons.x`), and `search-box.spec.ts` (7 tests: label/icon wiring, `#qx` absent/immediate-present, two fake-timer debounce tests, clear-cancels-debounce, and focus-return). First test run failed `http.verify()` because `loadList()`'s `refreshTagRail()` follow-up issues `/api/tags`/`/api/bookmarks/count` requests that the tests never flushed, and a failed assertion left `TestBed` unable to reconfigure for subsequent tests in the file. Second attempt added the missing flushes but still failed because the flush calls ran before the awaited promise's continuation (which issues those follow-up requests) had executed as a microtask. Third attempt inserted `await Promise.resolve()` twice between the primary flush and the follow-up `expectOne` calls, which let the microtask queue drain first

**Your decision:** TODO(human)

**What you changed and why:** TODO(human)

**How you verified it:** Ran `npx prettier --write src/app/features/search-box` and `npx eslint src/app/features/search-box --fix` (0 errors both times), `npx ng build` (succeeded each attempt, ~2.3-3.1s), and `npx ng test --watch=false` across all three attempts — final run: 12 files, 181/181 tests passed (7 new), no regression

**Outcome:** worked (after 2 fix attempts)

**Iteration:** 2 fix attempts — see Build-Verify Log rows for F05-T08 in `tasks.md`

**Approx. time:** TODO(human)

**Learning:** TODO(human)
