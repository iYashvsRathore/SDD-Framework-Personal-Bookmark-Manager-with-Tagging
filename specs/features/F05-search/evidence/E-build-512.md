### Evidence E-build-512

**SDLC activity:** build

**Task/feature:** F05-T13 — extend `bookmark-list.spec.ts` with tests for the corrected empty-state precedence order and the no-results state's conditional second action (`web`, F05-AC7, AC8, F05-EC3, F05-EC5)

**Context given to AI:** `tasks.md` F05-T13's row; the current `bookmark-list.html` (F05-T09's reordered branches) and `bookmark-list.spec.ts` (the existing `F04-AC9` tag-empty test and the shared `beforeEach`'s `allCount.set(1)` default)

**Prompt/request:** Implement F05-T13 per the task brief: add tests asserting all-empty beats both tag-empty and search-no-results, and that the no-results state's second `Clear tag filter` action only appears when a tag filter is also active

**AI response summary:** Added a new `describe` block with 5 tests: all-empty wins when search+tag are both set but `allCount() === 0`; search-no-results wins over tag-empty when both are active but `allCount() > 0`; only `Clear search` renders with no tag filter; both `Clear search` and `Clear tag filter` render with one; and `Clear search`'s click wiring to `store.clearSearch()`. One test failed on the first run — it exposed a real template bug introduced in F05-T09: `@else if (... store.search() !== ''; as activeSearchForEmpty)` binds `as` to the boolean result of the whole condition expression, not to `store.search()`, so the heading rendered the literal string `"true"` instead of the search text. Fixed by reading `store.search()` directly in the heading interpolation instead of relying on the `as` alias

**Your decision:** TODO(human)

**What you changed and why:** TODO(human)

**How you verified it:** Ran `npx prettier --write ...` and `npx eslint ... --fix` (0 errors), `npx ng build` (succeeded, 3.8s), and `npx ng test --watch=false` (12 files, 186/186 tests passed — 5 new, no regression)

**Outcome:** worked (after 1 fix attempt — which also fixed a latent F05-T09 bug)

**Iteration:** 1 fix attempt — see Build-Verify Log rows for F05-T13 in `tasks.md`

**Approx. time:** TODO(human)

**Learning:** TODO(human)
