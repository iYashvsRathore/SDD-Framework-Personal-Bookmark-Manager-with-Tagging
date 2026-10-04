### Evidence E-build-509

**SDLC activity:** build

**Task/feature:** F05-T09 — reorder `BookmarkList`'s empty-state branch precedence and add the search no-results state (`web`), F05-AC7, AC8, F05-EC3, F05-EC5, F05-EC6

**Context given to AI:** `lld.md` §2, §11 (LD-06, the corrected precedence rule); `tasks.md` F05-T09's row; `docs/mockup.html`'s `empty(kind)` function (the `none`/`search`/`tag` message table and its `!n ? 'none' : q ? 'search' : 'tag'` precedence, where `n` is the unfiltered count); the current `bookmark-list.html` (all-empty and tag-empty `@else if` branches, in the wrong precedence order per the F05 LLD's design-alternatives discussion from `/design-feature`)

**Prompt/request:** Implement F05-T09 per the task brief: reorder so `store.allCount() === 0` is checked first, add a search no-results branch (heading `No bookmarks match "<q>"`, fixed copy, primary `Clear search`, and a conditional secondary `Clear tag filter` only when a tag filter is also active), ahead of the existing tag-empty branch

**AI response summary:** Rewrote the three `@else if` branches in the corrected order (all-empty → search-no-results → tag-empty → list), using `icons.search` for the new branch's art and porting the exact mockup copy. `ng build` succeeded immediately, but `ng test --watch=false` regressed 12 previously-passing tests across `bookmark-list.spec.ts` and `app.spec.ts` — every populated-list fixture in those files left `store.allCount()` at its default `0`, so the new all-empty branch (which checks `allCount() === 0` first) now rendered instead of the list/other empty states those tests expected. Fixed by adding a default `store.allCount.set(1)` to `bookmark-list.spec.ts`'s shared `beforeEach` (with an explicit `.set(0)` override in the one test that exercises the true all-empty state) and an explicit `allCount.set(1)` in `app.spec.ts`'s `viewExisting` test, which populates the list without ever setting `allCount`

**Your decision:** TODO(human)

**What you changed and why:** TODO(human)

**How you verified it:** Ran `npx prettier --write ...` and `npx eslint ... --fix` (0 errors), `npx ng build` (succeeded, ~2.9s), and `npx ng test --watch=false` — final run: 12 files, 181/181 tests passed, no regression

**Outcome:** worked (after 1 fix attempt)

**Iteration:** 1 fix attempt — see Build-Verify Log rows for F05-T09 in `tasks.md`

**Approx. time:** TODO(human)

**Learning:** TODO(human)
