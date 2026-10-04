### Evidence E-build-507

**SDLC activity:** build

**Task/feature:** F05-T07 — extend `bookmarks.store.ts` with `search` state, `setSearchText`/`clearSearch`, `loadList()` threading, and `countText` composition (`web`); F05-T12 — the matching `bookmarks.store.spec.ts` assertions, written together with the store change rather than as a separate pass (F05-AC9, AC10, AC13)

**Context given to AI:** `lld.md` §2, §11; `tasks.md` F05-T07's and F05-T12's rows; the full current `bookmarks.store.ts` (430 lines), in particular the F04 tag-filter precedent (`tagFilter` signal, `selectTag`/`toggleTagFilter`/`clearTagFilter`, the `listRequestToken` out-of-order guard in `loadList()`, and the existing `countText` computed); the existing `bookmarks.store.spec.ts` F04 `describe('BookmarksStore — tag filter (F04)', ...)` block as the test-shape precedent

**Prompt/request:** Implement F05-T07 per the task brief: add `search` signal (`''` default), `setSearchText(value)`/`clearSearch()` methods mirroring `selectTag`/`clearTagFilter`'s set→page.set(1)→loadList() pattern, thread `this.search()` into `api.listBookmarks()`'s 4th arg as `null` when empty, and update `countText` to check `search() !== ''` alongside `tagFilter() !== null`. Also wrote F05-T12's store-spec assertions in the same pass since the two tasks' done-checks are textually identical

**AI response summary:** Added the `search` signal grouped with the F04 tag-filter state; updated `countText`'s condition to an `||`; changed `loadList()`'s `api.listBookmarks()` call to a multi-line call passing `this.search() === '' ? null : this.search()` as the 4th argument; added `setSearchText`/`clearSearch` methods adjacent to `clearTagFilter`. Added a new `describe('BookmarksStore — search (F05)', ...)` block with 7 tests: `setSearchText` alone and composed with an active tag filter (asserting the exact built query string), `clearSearch`, an out-of-order `loadList()` guard test (search call racing a prior call, mirroring F04-EC4's test shape), and three `countText` composition cases (search alone, both active, neither active)

**Your decision:** TODO(human)

**What you changed and why:** TODO(human)

**How you verified it:** Ran `npx prettier --write src/app/state/bookmarks.store.ts src/app/state/bookmarks.store.spec.ts` and `npx eslint ... --fix` (0 errors), then `npx ng build` (succeeded, 3.0s), then `npx ng test --watch=false` (11 files, 174/174 tests passed — 7 new, no regression)

**Outcome:** worked

**Iteration:** None needed — clean on the first attempt

**Approx. time:** TODO(human)

**Learning:** TODO(human)
