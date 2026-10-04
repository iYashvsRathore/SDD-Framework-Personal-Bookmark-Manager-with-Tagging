### Evidence E-testing-701

**SDLC activity:** testing

**Task/feature:** F07-delete-bookmark — close the test-phase gaps found by reading `tasks.md`'s Build-Verify Log against the actual content of `delete-bookmark.test.js`/`restore-bookmark.test.js`: the log claimed F07-AC14/AC15 (restart persistence) were covered by those files, but neither file contained a restart check; F07-AC11 (delete-triggered pagination clamp), F07-AC12 (tag rail disappearance trigger) and F07-AC13 (empty-list trigger) also had no test anywhere in the suite.

**Context given to AI:** `spec.md` (16 AC, 6 edge cases), `lld.md` §4/§5/§8/§11 (contract, data access, error handling, test hooks — explicitly carrying AC14/AC15's restart check to `/test-phase`), `tasks.md`'s Build-Verify Log and Done-when text for F07-T05/T06, `product-spec.md` NFR-02/NFR-03, `component-map.json` test commands, and the full existing F07 test files (`delete-bookmark.test.js`, `restore-bookmark.test.js`, `delete-confirm.spec.ts`, `toast.spec.ts`, `bookmarks.store.spec.ts`, `bookmark-list.spec.ts`) read end-to-end before writing anything, to confirm which ACs were already genuinely exercised versus only claimed.

**Prompt/request:** `/test-phase F07` — after presenting a test plan preview naming the five gaps and receiving `GO`, write and run the missing tests, then re-run the full regression for both components.

**AI response summary:** Added four new route-level `describe` blocks to `delete-bookmark.test.js` (F07-AC11: delete the last remaining item on page 3 of a 25-row/size-10 list, confirm the next GET clamps to page 2; F07-AC12: delete a tag's one live bookmark, confirm it drops out of `GET /api/tags`; F07-AC13: delete the one remaining live bookmark, confirm `{items:[],total:0}`; F07-AC14: a real file-backed SQLite connection, closed and reopened, confirming a soft-deleted row stays deleted and out of `list()`). Added one new `describe` block to `restore-bookmark.test.js` (F07-AC15: the same close/reopen proxy, confirming a restored row reappears live with its original tags and `created_at`), following `restart-integrity.test.js`'s already-proven F06-AC9 pattern exactly.

**Your decision:** Accepted

**What you changed and why:** Nothing changed after review; all five new blocks were accepted as written and the Testing gate was approved as presented.

**How you verified it:** Ran `npx prettier --write` / `npx eslint . --fix` on both edited files (0 errors). Ran `npx vitest run test/delete-bookmark.test.js` in isolation first: **18 passed (18)**. Ran the full `api` suite: `npx vitest run` → **30 test files, 516 tests passed, 0 failed** (up from 503 before this phase). Ran the full `web` suite: `npx ng test --watch=false` → **15 test files, 207 tests passed, 0 failed** (unchanged — no web code or tests were touched this phase, all F07 web-side AC/EC coverage was already complete from the build phase). dev-1 performed the F07-AC16 keyboard walkthrough (confirmation dialog Tab order/focus/Esc, undo toast Tab/Enter/Space) against the live running app and confirmed: "All passed."

**Outcome:** worked

**Iteration:** None — all five new test blocks passed on the first run; no failure occurred this phase.

**Approx. time:** TODO(human)

**Learning:** TODO(human)
