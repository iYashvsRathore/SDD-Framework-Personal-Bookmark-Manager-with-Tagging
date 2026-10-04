### Evidence E-build-513

**SDLC activity:** build

**Task/feature:** F05-T14 — manual keyboard walkthrough (`web`/`api`, F05-AC12) — two defects surfaced during the walkthrough and fixed before the walkthrough could be re-attempted

**Context given to AI:** F05-T14's task row in `tasks.md`; the running `npm start` server started earlier in the session to support the manual walkthrough; the human's report of two bugs instead of a pass/fail result

**Prompt/request:** The human reported: (1) "The search performs after debounce time but it is not filtering the list with the search URL or title. basically it does not filter and instead show all items." (2) "also on the search when we type something i can see two (x) buttons and on clicking on either clears the text. there should be only one (x) button"

**AI response summary:** Investigated Bug #1 by reproducing it directly against the running server with `curl`/`Invoke-RestMethod` (`GET /api/bookmarks?q=youtube` returned all 4 rows, `total: 4`), then read every backend layer in the call chain (`routes/bookmarks.js` → `services/bookmark-service.js` → `services/list-query.js` → `data/bookmark-repository.js`) and confirmed each was logically correct — `buildPredicate()`/`normalizeSearchValue()` invoked directly, and the resulting SQL run directly against the production `data/tagvault.db` file, both returned the correct filtered row. This ruled out a code defect. Checked `netstat -ano` for the PID bound to port 3000 and found it had been running since before this session's F05 code was finalized — a stale server process serving pre-F05 code from memory. Killed it (`Stop-Process -Force`). Investigated Bug #2 by reading `search-box.html`: the native `<input type="search">` renders the browser's own built-in clear icon (`::-webkit-search-cancel-button`) in addition to the component's own conditional `.cl` button, producing two visible "x" icons. Fixed by adding CSS to suppress the native icon (`::-webkit-search-cancel-button`, `::-webkit-search-decoration`, `::-ms-clear`) in `styles.css`, leaving only the component's own button. Ran the full build-verify loop for the CSS change (format/lint/build/test for `web`, plus a full `api` test run as a sanity check since the investigation touched api code paths), then restarted `npm start` fresh and re-confirmed via `curl` that `q=youtube` now correctly returns only the 1 matching row.

**Your decision:** TODO(human)

**What you changed and why:** TODO(human)

**How you verified it:** Ran `npx prettier --write src/styles.css`, `npx eslint . --fix`, `npx ng build` (0 lint errors, build succeeded) in `app/web`; `npx ng test --watch=false` (12 files, 186/186 passed, no regression); `npx vitest run` in `app/api` (25 files, 452/452 passed, no regression). Restarted the api server fresh and re-ran `curl "http://localhost:3000/api/bookmarks?page=1&size=20&q=youtube"`, which now returns exactly 1 row (`total: 1`, the "Youtube" bookmark) versus the 4 unfiltered rows from `GET /api/bookmarks?page=1&size=20` with no `q`. The human then reported the first Bug #2 attempt (`-webkit-appearance: none` on `::-webkit-search-cancel-button`/`::-webkit-search-decoration`) still showed two "x" buttons in their browser. Replaced it with `display: none` on `::-webkit-search-cancel-button` alone (matching `docs/mockup.html` line 41's already-proven rule exactly), rebuilt (`npx ng build`, new bundle `styles-7QAVGTJO.css`), re-ran `npx ng test --watch=false` (186/186, no regression), restarted the server fresh again, and confirmed the new CSS bundle was being served via `curl`. The human then re-performed the F05-T14 keyboard walkthrough and confirmed: "Great job, its fixed now."

**Outcome:** worked — both bugs confirmed fixed by the human after two CSS iterations

**Iteration:** 6 troubleshooting steps — see Build-Verify Log rows for F05-T14 in `tasks.md`

**Approx. time:** TODO(human)

**Learning:** Automated tests (452 api, 186 web) all passed throughout and never caught Bug #1, because the bug was never in the code under test — it was a stale, already-running server process left over from before the F05 backend changes were saved to disk. A green test suite only proves the code on disk is correct; it says nothing about which code a *separately running* process actually has loaded in memory. Any manual/live verification step must restart the server being tested immediately beforehand, or explicitly confirm (via the process start time, or a version/commit marker in a health endpoint) that it is running current code. Separately, for Bug #2: `-webkit-appearance: none` alone does not reliably hide `::-webkit-search-cancel-button` in current Chrome/Edge — `display: none` is the rule that actually works, and `docs/mockup.html`'s reference CSS already had the correct form; it should have been copied verbatim the first time instead of guessed at.
