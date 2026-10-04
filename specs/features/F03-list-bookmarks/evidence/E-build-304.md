### Evidence E-build-304

**SDLC activity:** build

**Task/feature:** F03-T05 — list state in `BookmarksStore` (`items`, `total`, `page`, `size`, `listLoading`, `listError`, `countText`, `maxPage`, `loadList()`, `changePage()`, `changePageSize()`, `retryList()`), and a defect found while writing its tests.

**Context given to AI:** `spec.md` F03-AC11 (one fixed error message for the list's error state, regardless of cause), `lld.md` LD-04's stale-response request-token guard, and the store's existing `save()` flow from F01.

**Prompt/request:** Build F03-T05 to the LLD's state shape and done-when clause.

**AI response summary:** The store and its tests were written in one pass. Running the new tests surfaced two separate issues: (1) a new "save refreshes the list" test asserted state immediately after `http.expectOne(...).flush(...)` without awaiting the microtask of the fire-and-forget `void this.loadList()` call, which Copilot fixed with `await Promise.resolve()` before the assertion, matching no prior precedent in this codebase (this was the first occurrence, later reused at T08); (2) while re-reading `spec.md` §2 against the written code, Copilot caught that `loadList()`'s failure path reused `toApiError(error).message`, which varies by cause and does not satisfy F03-AC11's requirement for one fixed message — fixed to a constant string before starting T06, since T06's error-state rendering depends on it.

**Your decision:** Accepted

**What you changed and why:** Nothing was changed — both the async-timing fix and the AC11 fixed-message fix were accepted as proposed.

**How you verified it:** `npx ng test --watch=false` reported all tests passing after both fixes. The suite asserts `countText()` reads `1 bookmark` for `total=1` and `N bookmarks` otherwise, `changePageSize()` sets `page` to `1` before calling the API, resolving two fake `listBookmarks()` promises out of order leaves `items` matching only the later call's result (the LD-04 guard), and `listLoading` is `true` only while a request is in flight.

**Outcome:** worked

**Iteration:** The AC11 fix was folded into T05 rather than deferred to T06, since T06's error-state test would otherwise have pinned the wrong (non-fixed) message.

**Approx. time:** 15-20 minutes

**Learning:** TODO(human)
