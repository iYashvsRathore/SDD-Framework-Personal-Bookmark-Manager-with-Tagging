<!-- GUIDE: Created by /constitution INIT. Filled only by the gate rollup after /test-phase approvals (feature and app). Keep the ## headings exactly as they are. Replace each _Pending_ line and its GUIDE comment when the section is filled. -->
# 04 · Testing

## Test Strategy

Automated: Vitest (`app/api`, 15 files) exercises service/route/lib logic via `npx vitest run`, with coverage measured over `src/services/**` and `src/lib/**` (`vitest.config.js`, HLD §5) against the Q4 80% target. Angular's test runner (`app/web`, 6 files, `npx ng test`) covers component/form/accessibility structure. Isolation: in-memory/temp SQLite per test, no real network calls (fake `lookup`/`request`/`clock` doubles in the title-fetch seam per `lld.md` §11), synthetic URLs only (`https://example.com/...`). Manual: two checks automated tests cannot perform — rendered-DOM script inertness and a real keyboard focus trap — relayed to and performed by dev-1.

One check per `product-spec.md` NFR target:
- **NFR-04 (security):** an SSRF address-range probe (private/loopback/reserved hosts, incl. DNS-rebinding), a SQL-metacharacter probe (`'; DROP TABLE bookmark; --'`) in F01's title/URL fields, a new SQL-injection-shaped probe directly on F03's `page`/`size` query parameters, and (F02) attack-shaped tag payloads (SQL-metacharacter, XSS-shaped) plus a literal-`_`-in-prefix proof against a real database (S6).
- **NFR-03 (accessibility, F02):** `tag-input.spec.ts`'s structural keyboard/ARIA tests, plus dev-1's manual keyboard walkthrough of the tag chip input (F02-AC10), cited from the Build gate (F02-T12) and not re-run this phase since no UI code changed since.
- **NFR-03 (accessibility, F04):** `tag-rail.spec.ts`'s/`bookmark-list.spec.ts`'s structural `aria-pressed`/focus-order tests, plus dev-1's manual keyboard walkthrough of the tag rail and active-filter chip (F04-AC11), cited from the Build gate (F04-T12) and not re-run this phase since no UI code changed since.
- **NFR-05 (timing):** the existing simulated-clock 5 s budget check, plus a real wall-clock measurement against a genuinely unresponsive loopback TCP server.
- **NFR-01 (list performance, F03; tag-filter performance, F04; search performance, F05):** a real HTTP server over a real SQLite connection seeded with 1,000 synthetic bookmarks (`data-model.md` §6 recipe), 20 timed real requests each at page 1, the last page, a tag filter (F04), and a search query (F05) — median and max reported, not estimated (Q6).
- **NFR-02 (persistence):** F01's half cited from the Build gate's real stop/start check (byte-identical result) — not re-run this phase since no persistence-path code changed; a fault-injection test proves an aborted transaction leaves zero partial rows. F03's half (F03-AC7) re-verified this phase at the full 1,000-record volume across two real process restart cycles — byte-identical pages and totals both times. F07's half (F07-AC14/AC15, delete/restore) verified this phase with the same real file-backed close/reopen proxy: a soft-deleted row stays deleted and out of `list()`, and a restored row comes back live with its original tags and `created_at`.
- **NFR-03 (accessibility, F07):** `delete-confirm.spec.ts`'s/`toast.spec.ts`'s structural focus/ARIA tests, plus dev-1's manual keyboard walkthrough of the delete confirmation dialog and the undo toast (F07-AC16), performed live during this phase: dev-1 confirmed "All passed."
- **Accessibility:** Angular structural tests plus dev-1's manual keyboard-only walkthrough (F01-AC17, F03-AC9, F04-AC11, F07-AC16).
- **App-level (NFR-01..05, all):** every target was already measured/checked per-feature at its real volume or real condition (cited above); the app-level gate adds one new check no feature gate could perform in isolation — a single continuous cross-feature journey thread (F01→F02→F03→F04→F05→F06→F07→F08) over one shared real HTTP server and one real SQLite connection, proving state composes correctly across feature boundaries, plus a full regression re-run of both suites and a live smoke check.

## Test Matrix

| ID | Requirement | Scenario | Expected result | Actual result | Pass/Fail | AI helped? |
|---|---|---|---|---|---|---|
| F01-TC01 | F01-AC1 happy path | Valid URL + user title, save | 201, row with `title_source='user'` | `bookmark-service.test.js`/`bookmarks-route.test.js` — observed passed (275/275 suite run) | Pass | Yes |
| F01-TC02 | F01-AC2 no fetch when user title given | User title supplied | Fetcher never called | `bookmark-service.test.js` "F01-AC2" — observed passed | Pass | Yes |
| F01-TC03 | F01-AC3 save toast | Save succeeds | Dialog closes, `Bookmark saved` toast in `aria-live` region | Angular structural test — observed passed (web suite 49/49) | Pass | Yes |
| F01-TC04 | F01-AC4 fetched title | Empty title, page has `<title>` | 201, `title_source='fetched'`, entities decoded | `title-fetch.test.js` "F01-AC4" — observed passed | Pass | Yes |
| F01-TC05 | F01-AC5 fetch-failure fallback | Fetch times out/non-2xx/etc. | 201, hostname fallback + toast notice | `title-fetch.test.js` + `bookmark-service.test.js` "F01-AC5" + Angular structural test — observed passed | Pass | Yes |
| F01-TC06 | F01-AC6 / NFR-05, simulated clock | Host never responds (fake clock) | Abandoned at 5 s budget | `title-fetch.test.js` "F01-AC6/NFR-05" — observed passed | Pass | Yes |
| F01-TC06b | F01-AC6 / NFR-05, real clock **(new)** | Real unresponsive loopback TCP server | Abandoned ≤ 5.5 s real time | `nfr05-timing.test.js` (new) — **observed elapsedMs = 5016**, within the asserted 4900–5500 ms bound | Pass | Yes |
| F01-TC07 | F01-AC7 empty URL | Empty/whitespace URL | 400 `INVALID_URL`, exact message | `validate-url.test.js` rule 1 — observed passed | Pass | Yes |
| F01-TC08 | F01-AC8 no scheme / no dot | `example.com`, `http://localhost`, etc. | 400 `INVALID_URL` | `validate-url.test.js` rules 3–5 — observed passed | Pass | Yes |
| F01-TC09 | F01-AC9 dangerous schemes | `javascript:`, `file:`, `ftp:`, `data:` | 400 `INVALID_URL`, no fetch, never reaches `href` | `validate-url.test.js` + `bookmarks-route.test.js` "F01-AC9" — observed passed | Pass | Yes |
| F01-TC10 | F01-AC10 length boundary | 2,049 vs 2,048 chars | 400 vs 201 at exact boundary | `validate-url.test.js` rule 2 — observed passed | Pass | Yes |
| F01-TC11 | F01-AC11 duplicate | Same URL, different case | 409 `DUPLICATE_URL`, banner fields | `bookmark-service.test.js`/`bookmarks-route.test.js` "F01-AC11" + Angular structural test — observed passed | Pass | Yes |
| F01-TC12 | F01-AC12 normalization | Trailing slash, fragment, `:443`, punycode | 409 for equivalents; path-case differs → 201 | `url-normalize.test.js` + `bookmark-service.test.js` "F01-AC12" — observed passed | Pass | Yes |
| F01-TC13 | F01-AC13 SSRF address-range | Private/loopback/link-local/reserved hosts, incl. redirect hop 2–3 | No TCP connection opened; 201 hostname fallback | `title-fetch.test.js` "F01-AC13/EC09" + `address-range.test.js` — observed passed | Pass | Yes |
| F01-TC13b | F01-EC2 DNS-rebinding **(new)** | `lookup` resolves public on check, private on connect, same host | Fetcher never re-resolves; connects only to the first (public) address; zero TCP attempt when private-from-start | `ssrf-rebinding.test.js` (new) — observed passed (2/2) | Pass | Yes |
| F01-TC14 | F01-AC14 duplicate submit | Save activated twice rapidly | Exactly one row; submit disabled in-flight | `bookmark-service.test.js` LD-02 + Angular structural test — observed passed | Pass | Yes |
| F01-TC15 | F01-AC15 / NFR-02 restart persistence | Stop/start process, `GET /api/bookmarks` | Rows byte-identical to pre-restart | Cited from Build gate T12 (manual stop/start, byte-identical result recorded) — not independently re-run this phase; no persistence code changed | Pass (cited) | Yes |
| F01-TC15b | EC19 restart mid-write fault-injection **(new)** | Transaction aborts mid-insert | Zero partial rows survive | `restart-integrity.test.js` (new) — observed passed | Pass | Yes |
| F01-TC15c | AMD-002 §4 cheap check **(new)** | Insert several normalized URLs | No live `url_normalized` ends in `/` with non-empty path | `restart-integrity.test.js` (new) — observed passed | Pass | Yes |
| F01-TC16a | F01-AC16 — storage/escaping half | Title = `<script>alert(1)</script>Hello` | Stored/returned as literal text, never `[innerHTML]` | `bookmark-service.test.js` "F01-AC16" + `bookmarks-route.test.js` — observed passed | Pass | Yes |
| F01-TC16b | F01-AC16 — no script executes (manual) | Same title, view rendered page | No alert/script executes | dev-1 confirmed: "no alert/script execute" | Pass | No |
| F01-TC16c | F01-AC16 — renders as visible literal text (manual) | Same title, view rendered page | Characters appear as visible text on screen | dev-1: "can not verify the first one at this moment" | **Not run** | No |
| F01-TC17 | F01-AC17 keyboard walkthrough (manual) | Keyboard-only navigation | Tab/Enter/focus-trap/Esc all work per spec | dev-1 confirmed Pass | Pass | No |
| F01-TC18 | NFR-04/S4 SQL-metacharacter probe **(new, AI-discovered)** | `'; DROP TABLE bookmark; --` in fetched title, user title, URL query | Payload stored/returned literally; `bookmark` table survives | `injection-probe.test.js` (new) — observed passed (3/3) | Pass | Yes |
| F03-TC01 | F03-AC1 | Ordering + shape | Newest `created_at` first, `{items,total,page,size}`, tags array | `list-route.test.js` "F03-AC1" — observed passed | Pass | Yes |
| F03-TC02 | F03-AC2 | Empty list | `200 {items:[],total:0,page:1,size:20}` | `list-route.test.js` "F03-AC2" — observed passed | Pass | Yes |
| F03-TC03 | F03-AC3 | 25 rows, no params | `size=20,page=1,items.length=20,total=25` | `list-route.test.js`/`bookmark-service.test.js` "F03-AC3" — observed passed | Pass | Yes |
| F03-TC04 | F03-AC4 | Page-size change resets to page 1 | Request is `page=1&size=20`, not `page=2` | `bookmarks.store.spec.ts`/`bookmark-list.spec.ts` "changePageSize" — observed passed | Pass | Yes |
| F03-TC05 | F03-AC5 | Invalid page/size (`500,7,abc,0,-1,abc`) | Always 200, documented fallback | `pagination.test.js` + `list-route.test.js` "F03-AC5" — observed passed | Pass | Yes |
| F03-TC06 | F03-AC6 | `page=99&size=10`, 25 rows | 200, `page=3`, real 5-row remainder | `list-route.test.js`/`bookmark-service.test.js` "F03-AC6" — observed passed | Pass | Yes |
| F03-TC07 | F03-AC7 / NFR-02 | Stop/start the real process twice, at 1,000 seeded rows **(new, at scale)** | Pages + `total` byte-identical each time | Real on-disk db seeded 1,000 rows; 3 process starts; run2 vs run1 — **0 diffs**, `total=1000` both; run3 vs run1 — **0 diffs**, `total=1000` both | Pass | Yes |
| F03-TC08 | F03-AC8 | Card rendering | Title link, bold host (no `www.`)+path, `Added …ago`, tag chips, Edit/Delete `aria-label`s | `bookmark-list.spec.ts` "F03-AC8" — observed passed | Pass | Yes |
| F03-TC09 | F03-AC9 keyboard walkthrough (manual) | Keyboard-only navigation | Tab reaches cards' Edit/Delete then pagination, visible focus, page as text | Cited from the Build gate: dev-1 confirmed 2026-10-01 against the live app, "Everything is working as expected" — not re-run this phase | Pass (cited) | No |
| F03-TC10 | F03-AC10 | Loading state | `aria-busy`, visible indicator, pagination disabled in-flight | `bookmark-list.spec.ts`/`bookmarks.store.spec.ts` "F03-AC10" — observed passed | Pass | Yes |
| F03-TC11 | F03-AC11 | Fetch failure | Fixed message + working Retry, same page/size re-issued | `bookmark-list.spec.ts` "F03-AC11" — observed passed | Pass | Yes |
| F03-TC12 | F03-AC12 | Singular/plural count | `1 bookmark` vs `N bookmarks` | `list-route.test.js` EC3 + `bookmark-list.spec.ts` "count region" — observed passed | Pass | Yes |
| F03-TC13 | NFR-01 **(new)** | 1,000 seeded rows, real HTTP, 20 reps each at page 1 and the last page | Median & max < 1,000ms | `nfr01-timing.test.js` — page1: **median=15ms, max=51ms**; last page: **median=12ms, max=21ms** (n=20 each) | Pass | Yes |
| F03-TC14 | NFR-04/S4 **(new, AI-discovered)** | SQL-injection-shaped `page`/`size` values (`1' OR '1'='1`, `1;DROP TABLE bookmark;--`, etc.) | 200, clamped fallback, table survives | `list-route.test.js` new describe block — observed passed (8/8) | Pass | Yes |
| F03-TC15 | F03-EC1 | `created_at` tie, `id DESC` tie-break | Stable, total split across pages | `list-route.test.js`/`bookmark-service.test.js` "F03-EC1" — observed passed | Pass | Yes |
| F03-TC16 | F03-EC2 | `total` exact multiple of `size` | Last page correct, no phantom empty page | `pagination.test.js`/`list-route.test.js` "F03-EC2" — observed passed | Pass | Yes |
| F03-TC17 | F03-EC5 | Bookmark with 0 tags | No tag-chip container rendered | `bookmark-list.spec.ts` "F03-EC5" — observed passed | Pass | Yes |
| F02-TC01 | F02-AC1 | Save with tags `Research`,`docs` | 201, `tags:["docs","research"]`, one `bookmark_tag` row each | `bookmark-service.test.js` "F02-AC1" + `bookmark-form.spec.ts` + T11 manual round-trip — observed passed (full suite 364/364) | Pass | Yes |
| F02-TC02 | F02-AC2 | Chip `research` then type `Research` | No 2nd chip; saved `tags===["research"]`, 1 link row | `tag-service.test.js`/`bookmark-service.test.js`/`bookmarks.store.spec.ts`/`tag-chip.spec.ts` "F02-AC2/EC14" — observed passed | Pass | Yes |
| F02-TC03 | F02-AC3 | Type only spaces, Enter/comma | No chip added, no error | `bookmarks.store.spec.ts` "F02-AC3" — observed passed | Pass | Yes |
| F02-TC04 | F02-AC4 | Type `urgent,docs,offline` | 3 chips appear, input clears | `tag-chip.spec.ts`/`bookmarks.store.spec.ts` "F02-AC4/EC1" — observed passed | Pass | Yes |
| F02-TC05 | F02-AC5 | 8 chips present, add 9th | No 9th chip; input clears; no error | `bookmarks.store.spec.ts` "F02-AC5" — observed passed | Pass | Yes |
| F02-TC06 | F02-AC6 | `POST` with 9 distinct valid tags | 400 `INVALID_TAG`, no row at all | `tag-service.test.js`/`bookmark-service.test.js` "F02-AC6" — observed passed | Pass | Yes |
| F02-TC07 | F02-AC7 | Type a 30-char tag | Chip shows first 24 chars, lowercased | `tag-chip.spec.ts`/`bookmarks.store.spec.ts` "F02-AC7" — observed passed | Pass | Yes |
| F02-TC08 | F02-AC8 | `POST` with 25-char / 24-char tag | 400 vs 201 at exact boundary | `tag-service.test.js`/`bookmark-service.test.js` "F02-AC8/EC3" — observed passed | Pass | Yes |
| F02-TC09 | F02-AC9 | `POST` with `re$earch`/`tag!` vs `front-end dev_2` | 400 charset message vs 201 | `tag-service.test.js`/`bookmark-service.test.js` "F02-AC9" — observed passed | Pass | Yes |
| F02-TC10 | F02-AC10 keyboard walkthrough (manual) | Tab/Enter/comma/Backspace/aria-label/label-for | All work per spec | `tag-input.spec.ts` structural tests — observed passed. Human walkthrough cited from the Build gate (F02-T12, 2026-10-01): all items "worked"; not re-run this phase, no UI code changed since | Pass (cited for the manual half) | Yes / No (manual) |
| F02-TC11 | F02-AC11 | `GET /api/tags?prefix=d` and case variants | Alphabetical array, case-insensitive match | `tag-repository.test.js`/`tag-service.test.js`/`tags-route.test.js` "F02-AC11/EC4" — observed passed | Pass | Yes |
| F02-TC12 | F02-AC12/EC25 | `GET /api/tags?prefix=` with 0 tags | `200 []`, no error | `tags-route.test.js` "F02-AC12/EC25" — observed passed | Pass | Yes |
| F02-TC13 | F02-AC13/EC5 | >10 tags share a prefix | Exactly 10, alphabetical | `tag-repository.test.js`/`tags-route.test.js` "F02-AC13/EC5" — observed passed | Pass | Yes |
| F02-TC14 | NFR-04/S1/S3 **(new, AI-discovered)** | SQL-metacharacter tag (`'; DROP TABLE tag; --`) and XSS-shaped tag (`<script>alert(1)</script>`) over real HTTP | 400 `INVALID_TAG`, zero rows, `bookmark`/`tag` tables intact | `tag-security-probe.test.js` (new) — observed passed (3/3) | Pass | Yes |
| F02-TC15 | NFR-04/S6 **(new, AI-discovered)** | Prefix `a_b` against seeded `a_bc`/`a1bc` | Matches only the literal `_`-containing tag, not a single-char wildcard | `tags-route.test.js` new describe block — observed passed | Pass | Yes |
| F02-TC16 | EC19 (data integrity, mechanism) | Forced failure mid-tag-linking | Zero bookmark rows, zero tag/link rows | `bookmark-service.test.js` "EC19" — observed passed | Pass | Yes |
| F04-TC01 | F04-AC1 | Rail renders alphabetical tag buttons + counts, `nav#tags` labelled | `All bookmarks` first with live total, then alphabetical tag buttons each with their count, `aria-pressed="false"` | `tag-rail.spec.ts`/`bookmarks-route.test.js` "F04-AC1" — observed passed | Pass | Yes |
| F04-TC02 | F04-AC2 | Activate rail/card tag control | `GET ?tag=`, button becomes pressed, active-filter chip appears, list narrows | `bookmarks.store.spec.ts`/`tag-rail.spec.ts`/`bookmark-list.spec.ts` "F04-AC2" — observed passed | Pass | Yes |
| F04-TC03 | F04-AC3 | Tag matches 2 of 3 bookmarks | `200`, exactly the 2 matching rows, each with full `tags[]` | `bookmark-service.test.js`/`bookmarks-route.test.js` "F04-AC3" — observed passed | Pass | Yes |
| F04-TC04 | F04-AC4 | Re-activate the active tag | Filter clears, next request drops `tag`, button un-pressed, chip disappears | `bookmarks.store.spec.ts`/`tag-rail.spec.ts`/`bookmark-list.spec.ts` "F04-AC4" — observed passed | Pass | Yes |
| F04-TC05 | F04-AC5 | Switch from one tag to another | Single `tag` param only, previous button un-pressed, new one pressed | `bookmarks.store.spec.ts`/`tag-rail.spec.ts` "F04-AC5" — observed passed | Pass | Yes |
| F04-TC06 | F04-AC6 | Change tag/page/size while filtered | Page resets to 1; a page-size change keeps `tag` | `bookmark-service.test.js` "F04-AC6" — observed passed | Pass | Yes |
| F04-TC07 | F04-AC7 / F04-EC1 | `tag=Research`, `tag=%20research%20` | Normalizes identically to stored lowercase/trimmed value | `list-query.test.js`/`bookmarks-route.test.js` "F04-AC7" — observed passed | Pass | Yes |
| F04-TC08 | F04-AC8 | `tag=doesnotexist` | `200 {items:[],total:0,page:1,size:20}`, never 400/500 | `bookmark-service.test.js`/`bookmarks-route.test.js` "F04-AC8" — observed passed | Pass | Yes |
| F04-TC09 | F04-AC9 / EC13 | Active filter, zero results | Tag-empty state with heading, copy, and `Clear tag filter` | `bookmark-list.spec.ts` "F04-AC9" — observed passed | Pass | Yes |
| F04-TC10 | F04-AC10 / EC17 | A tag's last bookmark is removed | Tag absent from rail; an active filter on it falls back to `All bookmarks` | `bookmark-service.test.js`/`bookmarks.store.spec.ts` "F04-AC10/EC17" — observed passed | Pass | Yes |
| F04-TC11 | F04-AC11 keyboard walkthrough (manual) | Keyboard-only navigation of the rail and chip | Tab order, visible focus, Enter/Space toggle, `aria-pressed` state | Cited from the Build gate: dev-1 confirmed 2026-10-01 against the live app, Tab order/focus/Enter-Space all correct — not re-run this phase | Pass (cited) | No |
| F04-TC12 | F04-AC12 | Count region with/without an active filter | `N of M bookmarks` filtered; `N bookmarks` unfiltered | `bookmark-list.spec.ts`/`bookmarks.store.spec.ts` "F04-AC12" — observed passed | Pass | Yes |
| F04-TC13 | NFR-01 tag-filter half **(new)** | 1,000 seeded rows, real HTTP, 20 reps at `tag=tag-5` | Median & max < 500ms | `nfr01-timing.test.js` — **median=15ms, max=23ms** (n=20) | Pass | Yes |
| F04-TC14 | NFR-04/S4 **(new, AI-discovered)** | SQL-metacharacter and XSS-shaped `?tag=` values | 200, zero matches, `bookmark`/`tag` tables intact | `tag-security-probe.test.js` new describe block — observed passed (2/2) | Pass | Yes |
| F04-TC15 | F04-EC2 | No bookmarks saved at all | Rail shows only `All bookmarks` with count 0 | `tag-rail.spec.ts` "F04-EC2" — observed passed | Pass | Yes |
| F04-TC16 | F04-EC3 | Tag name containing a space (`front end`) | Matches as a single filter value, equality unaffected | `list-query.test.js` "F04-EC3" — observed passed | Pass | Yes |
| F04-TC17 | F04-EC4 | Two tag selections in rapid succession | Only the most recent tag's result applies; stale response discarded | `bookmarks.store.spec.ts` "F04-EC4" — observed passed | Pass | Yes |
| F05-TC01 | F05-AC1 | `GET /api/bookmarks?q=tomato` against title/URL fixtures | 200; only the title-matching bookmark, `total=1` | `bookmarks-route.test.js`/`bookmark-service.test.js` — observed passed (re-run, 511/511 api suite) | Pass | Yes |
| F05-TC02 | F05-AC2, F05-EC4 | `q=docs` matches only in the URL, not the title | 200; bookmark included | `bookmark-service.test.js` URL-only fixture — observed passed | Pass | Yes |
| F05-TC03 | F05-AC3 | `q=TOMATO` vs `q=tomato` | identical `items`/`total` | `list-query.test.js`/`bookmark-service.test.js` case-insensitive fixtures — observed passed | Pass | Yes |
| F05-TC04 | F05-AC4, EC12 | `q=100%25` (literal `%`) | only `100% done` matches, `%` not a wildcard | `list-query.test.js` escaped-LIKE assertions (`ESCAPE '\\'`) — observed passed | Pass | Yes |
| F05-TC05 | F05-AC5, EC12 | `q=under_score` (literal `_`) | only the literal-underscore bookmark matches | `list-query.test.js`/`bookmark-service.test.js` underscore-escape fixtures — observed passed | Pass | Yes |
| F05-TC06 | F05-AC6, EC12, NFR-04/S4/S6 | `q=<script>alert(1)</script>` and `q=O'Reilly` | 200 in both cases, never an error; literal substring match only | `bookmarks-route.test.js` hostile-input fixtures + `injection-probe.test.js` SQLi payload via `q=` — observed passed | Pass | Yes |
| F05-TC07 | F05-AC7, EC11 | `q=zzzqqq` with no matches | 200, `items:[]`, `total:0`; no-results UI state | `bookmark-service.test.js` zero-match fixture + `bookmark-list.spec.ts` no-results heading/text/`Clear search` action — observed passed | Pass | Yes |
| F05-TC08 | F05-AC8, F05-EC5 | `total=0` overall, user types a query anyway | F03's all-empty state renders, not F05's no-results state | `bookmark-list.spec.ts` precedence-order tests (`allCount()===0` checked first) — observed passed | Pass | Yes |
| F05-TC09 | F05-AC9, F05-EC3 | `tag=research&q=guide` | items = intersection (AND) | `list-query.test.js` AND-join assertion + `bookmark-service.test.js` combined fixture — observed passed | Pass | Yes |
| F05-TC10 | F05-AC10, EC22 (search half) | search text or page-size changes while `q` active | `page` resets to 1; `q` still carried on size change | `bookmarks.store.spec.ts` `setSearchText`/size-change reset — observed passed | Pass | Yes |
| F05-TC11 | F05-AC11, F05-EC2 | `q=` 210 chars via direct API call | 200, never 400; capped at 200 chars server-side | `list-query.test.js` `normalizeSearchValue()` 210→200-char truncation + `bookmarks-route.test.js` 210-char case — observed passed | Pass | Yes |
| F05-TC12 | F05-AC12 keyboard walkthrough (manual + structural) | Tab to `#q`, visible focus, associated label, 250ms debounce, `#qx` conditional and keyboard-activatable | all conditions met | `search-box.spec.ts` fake-timer debounce tests — observed passed. Manual walkthrough cited from the Build gate (F05-T14, final attempt, dev-1 confirmed "Great job, its fixed now") — not re-run this phase, no UI code changed since | Pass (cited for the manual half) | Yes / No (manual) |
| F05-TC13 | F05-AC13, F05-EC1 | two keystrokes in flight, slower one resolves later | only the latest search text's response is shown | `bookmarks.store.spec.ts` out-of-order `listRequestToken` guard test — observed passed | Pass | Yes |
| F05-TC14 | F05-EC6 | clearing search while tag active, or vice versa | only the cleared predicate is dropped | `bookmarks.store.spec.ts` `clearSearch()`/`countText` composition tests — observed passed | Pass | Yes |
| F05-TC15 | NFR-01 search half **(new)** | 1,000 seeded rows, real HTTP, 20 reps at `q=bookmark&size=20` | spec.md §4 target <500ms (test file's own assertion is <1000ms — see Known Limitations) | `nfr01-timing.test.js` — **observed median=14ms, max=25ms** (n=20), passes either threshold | Pass | Yes |
| F06-TC01 | F06-AC1 | Activate a row's Edit button / "Edit existing" from the duplicate banner | Dialog opens titled `Edit bookmark`, pre-filled url/title/tags, submit reads `Save changes` | `bookmark-form.spec.ts`/`bookmark-list.spec.ts`/`app.spec.ts` — observed passed (re-run, 207/207 web suite) | Pass | Yes |
| F06-TC02 | F06-AC2 | Change url/title/tags, save | `PUT` 200, row updated, `updated_at` advances, `created_at` unchanged, toast `Changes saved` | `edit-bookmark.test.js` "F06-AC2" (service + route) — observed passed (re-run, 511/511 api suite) | Pass | Yes |
| F06-TC03 | F06-AC3 / F06-EC2 | Resave own unchanged URL | 200, not 409 (self-exclusion) | `edit-bookmark.test.js` "F06-AC3, F06-EC2" — observed passed | Pass | Yes |
| F06-TC04 | F06-AC4 | Edit URL to collide with another live bookmark | 409 `DUPLICATE_URL`, `existingId`, banner fields incl. tags/updatedAt | `edit-bookmark.test.js`/`bookmark-repository.test.js` "F06-AC4" — observed passed | Pass | Yes |
| F06-TC05 | F06-AC5, AC6 | Empty URL; 9 tags | 400 `INVALID_URL`/`INVALID_TAG`, row unmodified | `edit-bookmark.test.js` "F06-AC5, AC6" — observed passed | Pass | Yes |
| F06-TC06 | F06-AC7 **(new, automated)** | Edit X's title only; X older than Y | `GET /api/bookmarks` still lists Y before X — position unchanged despite `updated_at` advancing | `edit-bookmark.test.js` "F06-AC7" (new) — **observed passed**, `items.map(id)` = `[Y, X]` | Pass | Yes |
| F06-TC07 | F06-AC8 | Clear Title, save | Fetch-or-hostname-fallback path re-runs regardless of URL change; fallback toast in place of `Changes saved` on failure | `edit-bookmark.test.js` "F06-AC8 / C-F06-02" — observed passed | Pass | Yes |
| F06-TC08 | F06-AC9 / NFR-02 **(new)** | Edit a bookmark, close and reopen the real file-backed db connection | Returns edited values, not pre-edit ones; `created_at` unchanged | `restart-integrity.test.js` "F06-AC9" (new) — **observed passed**: url/title match the edit, `created_at` byte-identical, `updated_at` advanced | Pass | Yes |
| F06-TC09 | F06-AC10 | Save after the row was soft-deleted elsewhere | 404 `NOT_FOUND`, no row created/resurrected | `edit-bookmark.test.js` "F06-AC10" — observed passed | Pass | Yes |
| F06-TC10 | F06-AC11 / EC21 | Two sequential tab saves on the same row, second carries a stale `updatedAt` | Second call rejected 409 `EDIT_CONFLICT`; row keeps the first tab's values | `edit-conflict.test.js` + `edit-bookmark.test.js` "F06-AC11" — observed passed | Pass | Yes |
| F06-TC11 | F06-AC12 | Activate "Edit existing" from the add dialog's duplicate banner | Edit dialog opens pre-filled from the existing record; abandoned add values discarded | `app.spec.ts` "F06-AC12" — observed passed | Pass | Yes |
| F06-TC12 | F06-AC13 keyboard walkthrough (manual) | Keyboard-only navigation of the edit dialog | Tab order, visible focus, chip-input keys, `Esc` returns focus to the row's own Edit button | Cited from the Build gate: dev-1 confirmed 2026-10-01 against the live app (F06-T11) — not re-run this phase, no UI code changed since | Pass (cited) | No |
| F06-TC13 | NFR-04/S4 **(new, AI-discovered)** | SQL-metacharacter title, SQL-metacharacter URL query string, SQLi-shaped `:id` on `PUT /api/bookmarks/:id` | Payload stored/returned literally or safe 404; `bookmark` table survives | `edit-bookmark.test.js` new describe block (new) — **observed passed (3/3)** | Pass | Yes |
| F06-TC14 | F06-EC1 | Edit tags down to zero | Succeeds, `tags: []` stored | `edit-bookmark.test.js` "F06-EC1" — observed passed | Pass | Yes |
| F06-TC15 | F06-EC3 | "Edit existing" from the duplicate banner discards the abandoned add attempt | Edit dialog pre-filled from the existing record only, no merge with typed-but-unsaved add values | `app.spec.ts` "F06-AC12" (covers EC3 by the same assertion) — observed passed | Pass | Yes |
| F07-TC01 | F07-AC1 | Activate a card's Delete button | Confirmation dialog opens, titled `Delete this bookmark?`, naming title/URL, focus on Cancel not Delete | `delete-confirm.spec.ts` "F07-AC1" + `bookmark-list.spec.ts` "deleteRequested" — observed passed (re-run, 207/207 web suite) | Pass | Yes |
| F07-TC02 | F07-AC2 | Cancel or Esc while the dialog is open | Dialog closes, no request sent, focus returns to the opening Delete button | `delete-confirm.spec.ts` "F07-AC2" (both Cancel and the native `close` event) — observed passed | Pass | Yes |
| F07-TC03 | F07-AC3 | Confirm Delete | `DELETE /api/bookmarks/:id` → 204, `deleted_at` set, dialog closes, `Bookmark deleted` toast with Undo, list reloads without the row | `delete-bookmark.test.js` "F07-AC3" (service + route) — observed passed | Pass | Yes |
| F07-TC04 | F07-AC4 | Activate Undo before the toast clears | `POST .../restore` → 200, `deleted_at` cleared, tags/position unchanged, toast clears | `restore-bookmark.test.js` "F07-AC4" (service + route) — observed passed | Pass | Yes |
| F07-TC05 | F07-AC5, F07-EC3 | 6 seconds elapse, Undo never activated | Toast clears itself automatically; the delete stands | `bookmarks.store.spec.ts` "the toast auto-clear timer (LD-02)", `vi.useFakeTimers()` — observed passed | Pass | Yes |
| F07-TC06 | F07-AC6, EC21 | `DELETE` called again on an already-deleted row | 404 `NOT_FOUND`, exact message, no row change, list refreshes silently | `delete-bookmark.test.js` "F07-AC6, EC21" (service + route) — observed passed | Pass | Yes |
| F07-TC07 | F07-AC7, EC21, LD-03 | URL re-saved as a new bookmark, then Undo activated on the original | `POST .../restore` → 409 `DUPLICATE_URL`, restore-specific message, original stays deleted | `restore-bookmark.test.js` "F07-AC7, LD-03" (service + route) — observed passed | Pass | Yes |
| F07-TC08 | F07-AC8 | `restore` called on a live, already-restored, or never-existed row | 404 `NOT_FOUND`, no row created/changed | `restore-bookmark.test.js` "F07-AC8, AC10" — observed passed | Pass | Yes |
| F07-TC09 | F07-AC9, F07-EC1 | Confirm Delete activated twice in rapid succession | Exactly one soft delete persists; second request 404; exactly one toast, never a visible error | `delete-bookmark.test.js` "two rapid DELETE calls" + `delete-confirm.spec.ts` "a second rapid click" — observed passed | Pass | Yes |
| F07-TC10 | F07-AC10 | Non-numeric, zero, negative, or never-existed `:id` on `DELETE`/`restore` | 404 `NOT_FOUND` in every case, never a 500 | `delete-bookmark.test.js`/`restore-bookmark.test.js` "F07-AC10: every invalid :id shape" — observed passed (service + route) | Pass | Yes |
| F07-TC11 | F07-AC11 **(new)** | 25 bookmarks at size=10, page 3 holds exactly 1 item; delete it | Next `GET` clamps to page 2, not an empty page 3 | `delete-bookmark.test.js` "F07-AC11: pagination clamp" (new) — **observed passed**: before-delete page 3 had 1 item, after-delete page=2 with 10 items | Pass | Yes |
| F07-TC12 | F07-AC12 **(new)** | A tag's one live bookmark is deleted | `GET /api/tags` no longer lists the tag | `delete-bookmark.test.js` "F07-AC12" (new) — **observed passed**: tag present before delete, absent after | Pass | Yes |
| F07-TC13 | F07-AC13 **(new)** | The one remaining live bookmark is deleted | `GET /api/bookmarks` → `{items:[],total:0}` | `delete-bookmark.test.js` "F07-AC13" (new) — **observed passed** | Pass | Yes |
| F07-TC14 | F07-AC14 / NFR-02 **(new)** | Soft-delete a bookmark, close and reopen the real file-backed db connection | Row absent from `list()`; `deleted_at` still set | `delete-bookmark.test.js` "F07-AC14" (new, real file-backed db, same proxy as F06-AC9) — **observed passed** | Pass | Yes |
| F07-TC15 | F07-AC15 / NFR-02 **(new)** | Delete then restore a bookmark, close and reopen the real file-backed db connection | Row reappears live, tags and `created_at` unchanged | `restore-bookmark.test.js` "F07-AC15" (new, same real file-backed proxy) — **observed passed** | Pass | Yes |
| F07-TC16 | F07-AC16 | Keyboard-only navigation of the dialog and the undo toast | Dialog: Tab order Cancel→Delete, visible focus, Esc works. Toast: Undo reachable/operable by Tab/Enter/Space, `aria-live` region unchanged | `delete-confirm.spec.ts`/`toast.spec.ts` structural tests — observed passed. Manual keyboard walkthrough performed live this phase: dev-1 confirmed "All passed" | Pass | Yes / No (manual) |
| F08-TC01 | F08-AC1, F08-EC1 | `GET /api/settings/theme` on a fresh DB | 200, default `{theme:'light'}`, no row created | `setting-repository.test.js`/`setting-service.test.js`/`settings-route.test.js` "F08-AC1" — observed passed (re-run, 517/517 api suite) | Pass | Yes |
| F08-TC02 | F08-AC2 **(new)** | Fresh visit, no `localStorage` mirror | Renders light, `aria-pressed="false"`, label `Dark mode`, no OS `prefers-color-scheme` detection | `app.spec.ts` "F08-AC2/AC3 — header theme toggle wiring" (new) — **observed passed** | Pass | Yes |
| F08-TC03 | F08-AC3 **(new)** | Activate the toggle | `<html data-theme>` flips optimistically, `aria-pressed`/label flip, `PUT` fires, `localStorage` mirror written | `theme.store.spec.ts` (existing) + `app.spec.ts` new click-toggle case — **observed passed** (one Fail -> Fix -> Retest, below) | Pass | Yes |
| F08-TC04 | F08-AC4 | `setting` upsert-in-place | One row, `updated_at` advances, never a second row | `setting-repository.test.js` "F08-AC4" — observed passed | Pass | Yes |
| F08-TC05 | F08-AC5, EC26 **(new)** | Set theme to dark, close and reopen the real file-backed db connection | `GET` returns `{theme:'dark'}` after the restart proxy | `settings-route.test.js` "F08-AC5 / EC26" (new, real file-backed db, same proxy as F06-AC9/F07-AC14) — **observed passed** | Pass | Yes |
| F08-TC06 | F08-AC6, F08-EC2 | Invalid `PUT` body (`blue`, empty, missing) | 400 `INVALID_THEME`, exact message, no row written | `setting-service.test.js`/`settings-route.test.js` "F08-AC6" — observed passed | Pass | Yes |
| F08-TC07 | F08-AC7 keyboard walkthrough (manual) | Tab to the toggle, Enter/Space activate it | Visible focus indicator, `aria-pressed` state conveyed, Enter/Space work exactly as a click | dev-1 performed the walkthrough against the live app and confirmed: "passed" | Pass | No |
| F08-TC08 | F08-AC8, F08-EC3 | Toggle activated twice in rapid succession | Final state matches the last call; a stale response is discarded | `theme.store.spec.ts` "F08-AC8" — observed passed | Pass | Yes |
| F08-TC09 | F08-AC9, F08-EC4 | `GET /api/settings/theme` fails on load | App renders anyway, keeps the pre-paint/`localStorage` value, no blocking error | `theme.store.spec.ts` "F08-AC9" — observed passed | Pass | Yes |
| F08-TC10 | F08-AC10, F08-EC5 | `localStorage` throws on read/write | Theme still switches, `PUT` still succeeds, no uncaught error | `theme.store.spec.ts` "F08-AC10" — observed passed | Pass | Yes |
| APP-TC01 | App-level — cross-feature journey **(new)** | One continuous session: F01 add (2 bookmarks, tagged) → F03 list (order/shape) → F04 filter (shared tag, then narrows after edit) → F05 search (by title) → F06 edit (title+tags, self-exclusion) → F07 delete+restore → F08 theme default+flip→persist → F02 tag suggestions reflect final live state | Every step's state is correctly visible to and carried into the next feature's operation; no step 500s, no stale/incorrect data | `app-journey.test.js` (new) — **observed passed (1/1)**, real HTTP server + real in-memory SQLite, one shared db across all steps | Pass | Yes |

**App gate:** `npx vitest run --coverage` (api) → **31 test files, 518 passed (518), 0 failed** (up from 517 — the one new `app-journey.test.js`); coverage **97.34% stmts / 90.85% branch / 97.56% funcs / 99.29% lines** over `src/services` + `src/lib` (Q4 target 80%, up slightly from 97.13%/90.53%/96.34%/99.05% at the F08 gate). `npx ng test --watch=false` (web) → **16 test files, 212 passed (212), 0 failed** (up from 211 at the F08 gate — no new web test added this phase; this gate simply re-ran against the already-passing suite). `npx prettier --write` / `npx eslint . --fix` (api, the one new file) — clean, 0 errors. Smoke check: `GET /api/health` → 200, `GET /api/bookmarks` → 200, `GET /api/tags` → 200.

**F08 gate:** `npx prettier --write` / `npx eslint . --fix` (api, web) on the two edited test files — unchanged, 0 errors. `npx vitest run` (api, full suite) → **30 test files, 517 passed (517), 0 failed** (up from 516 at the Build gate — 1 new test for F08-AC5/EC26). `npx vitest run --coverage` (api) → **97.13% stmts / 90.53% branch / 96.34% funcs / 99.05% lines** over `src/services` + `src/lib` (Q4 target 80%). `npx ng test --watch=false` (web) → **15 test files, 211 passed (211), 0 failed** (up from 207 at the Build gate — 4 new tests for F08-AC2/AC3, after one Fail -> Fix -> Retest below). `npx ng test --coverage --watch=false` (web) failed outright — `@vitest/coverage-v8`/`@vitest/coverage-istanbul` not installed in this workspace; recorded as a Known Limitation, consistent with every prior F01–F07 gate (none measured web coverage either). dev-1 performed the F08-AC7 keyboard walkthrough against the live running app and confirmed: "passed."

**F06 gate:** `npx prettier --write .` (api) — all files unchanged except the three new test additions, formatted clean. `npx eslint . --fix` (api) — exit 0. `npx vitest run --coverage` (api) — **30 test files, 511 passed (511), 0 failed**; coverage **97.05% stmts / 90.27% branch / 96.25% funcs / 98.87% lines** over `src/services` + `src/lib` (Q4 target 80%, consistent with the F04 gate's 97.05%/90.27%/96.25%/98.87% — unchanged, since F06 added only test files this phase). `npx prettier --write .` / `npx eslint . --fix` (web) — clean, 0 errors. `npx ng test --watch=false` (web) — **15 test files, 207 passed (207), 0 failed** (one transient worker crash on the first attempt, unrelated to any test content — see Fail -> Fix -> Retest; the immediate retry passed clean).

**Run commands and observed counts:** `npx vitest run` (api) → **275 passed (275)**, 13 files, 0 failed (F01 gate). `npx vitest run --coverage` → 95.49% stmts / 86.61% branch / 90.38% funcs / 98.02% lines over `src/services` + `src/lib` (Q4 target 80%). `npx eslint . --fix` → exit 0. `npx prettier --check .` → "All matched files use Prettier code style!". Web suite (`app/web`) → 49 passed (49), unchanged from the Build gate baseline (F01 gate).

**F03 gate:** `npx vitest run` (api) → **319 passed (319)**, 15 files, 0 failed. `npx vitest run --coverage` → **96.14% stmts / 87.2% branch / 93.22% funcs / 98.49% lines** over `src/services` + `src/lib` (Q4 target 80%). `npx eslint . --fix` → exit 0. `npx prettier --check .` → "All matched files use Prettier code style!". `npx ng test --watch=false` (web) → **84 passed (84)**, 6 files, unchanged from the F03 Build gate baseline (no web code touched this phase).

**F02 gate:** `npx vitest run` (api) → **364 passed (364)**, 20 files, 0 failed. `npx vitest run --coverage` → **96.93% stmts / 88.84% branch / 96.92% funcs / 99.17% lines** over `src/services` + `src/lib` (Q4 target 80%). `npx prettier --check .` → one file needed `--write`, then clean. `npx eslint . --fix` → exit 0. `npx ng test --watch=false` (web) → **116 passed (116)**, 8 files, unchanged from the F02 Build gate baseline (no web test files changed this phase). Smoke: `/api/health`/`/api/bookmarks`/`/api/tags` → 200/200/200.

**F04 gate:** `npx vitest run` (api) → **506 passed (506)**, 30 files, 0 failed. `npx vitest run --coverage` → **97.05% stmts / 90.27% branch / 96.25% funcs / 98.87% lines** over `src/services` + `src/lib` (Q4 target 80%). `npx ng test --watch=false` (web) → **207 passed (207)**, 15 files, 0 failed.

**F05 gate:** `npx vitest run` (api) → **511 passed (511)**, 30 files, 0 failed — all existing coverage from the Build gate (452 passed) re-run clean, plus the F06 additions already present. `npx vitest run test/nfr01-timing.test.js --reporter=verbose` (isolated) → `NFR-01 q=bookmark&size=20 — median=14ms max=25ms (n=20)`. `npx ng test --watch=false` (web) → **207 passed (207)**, 15 files, 0 failed.

**F07 gate:** `npx prettier --write .` / `npx eslint . --fix` (api) on the two edited test files — unchanged, 0 errors. `npx vitest run test/delete-bookmark.test.js` (isolated) → **18 passed (18)**. `npx vitest run` (api, full suite) → **30 test files, 516 passed (516), 0 failed** (up from 503 at the Build gate — 13 new tests covering F07-AC11–AC15). `npx ng test --watch=false` (web) → **15 test files, 207 passed (207), 0 failed**, unchanged from the Build gate (no web code or tests were touched this phase — all F07 web-side AC/EC coverage was already complete). dev-1 performed the F07-AC16 keyboard walkthrough against the live running app and confirmed: "All passed."

## AI-Discovered Edge Cases

- **NFR-04/S4 SQL-metacharacter probe in F01's title/URL fields (F01-TC18, `injection-probe.test.js`).** `product-spec.md`'s existing SQLi edge case (EC12) is written against F05's search field, which F01 doesn't have; this is a new probe written specifically for F01's write path (fetched title, user title, URL query string) using `'; DROP TABLE bookmark; --`. Result: **Pass** — the payload round-trips as literal data via parameterized queries; the `bookmark` table is intact after each attempt.
- **NFR-04/S4 SQL-injection-shaped probe directly on F03's `page`/`size` (F03-TC14, `list-route.test.js`).** F01's probe targets title/URL; F05's search-field SQLi edge case (EC12) doesn't exist yet. This is a new probe aimed specifically at the fields that feed `LIMIT`/`OFFSET`. Result: **Pass** — every payload clamps to the documented fallback over HTTP, and the `bookmark` table is intact after each attempt.

- **F02-TC14 — attack-shaped tag payloads (`tag-security-probe.test.js`).** Existing charset tests use plain disallowed characters (`re$earch`, `tag!`); this adds a SQL-metacharacter string and an XSS-shaped string specifically, proving `400 INVALID_TAG`, zero rows written, and both `bookmark`/`tag` tables intact. Result: **Pass**.

- **F04-TC14 — attack-shaped `?tag=` filter values (`tag-security-probe.test.js`, new describe block).** The existing probe only covers F02's tag *write* path (`POST`, rejects with `400`); F04's tag *filter* path (`GET ?tag=`) never rejects by design (F04-AC8), so this proves a SQL-metacharacter string and an XSS-shaped string sent as the filter value return `200` with zero matches, never `400`/`500`, with both tables intact. Result: **Pass**.
- **F06-TC06 — F06-AC7's ordering guarantee, automated (`edit-bookmark.test.js`, new describe block).** `tasks.md`'s F06-T11 covered this only via the manual walkthrough; this adds a deterministic automated check (edit an older row's title, confirm a newer row still lists first) so the guarantee no longer depends solely on a human re-observing it each time UI changes. Result: **Pass**.
- **F06-TC08 — F06-AC9's real-restart check, automated (`restart-integrity.test.js`, new describe block).** `lld.md` §11 explicitly carried the real multi-process restart check for F06 to `/test-phase`, having tested only the pre-edit create/restart path at F01/F03. This closes it with a genuinely file-backed SQLite connection (not `:memory:`), closed and reopened — the same proxy class F01/F03 already used for their own restart checks. Result: **Pass**.
- **F06-TC13 — a SQL-metacharacter/SQLi-shaped probe aimed specifically at `PUT /api/bookmarks/:id` (`edit-bookmark.test.js`, new describe block).** F01's `injection-probe.test.js` only exercises the `POST` (create) path; no existing test had probed the edit path's body fields or its `:id` route parameter with attack-shaped input. Result: **Pass** — the title/URL payloads round-trip as literal data, and a SQLi-shaped `:id` segment resolves to a safe `404`, never a `500`; the `bookmark` table is intact in every case.
- **F02-TC15 — literal `_` in a tag-prefix query (`tags-route.test.js`).** `tag-service.test.js` only proves the escaped value is *forwarded* to the repository; this proves at the real-HTTP + real-SQLite level that an unescaped match would wrongly return `a1bc` for prefix `a_b`, and the actual (escaped) behavior returns only `a_bc`. Result: **Pass**.
- **F07-TC11/TC12/TC13 — three ACs `tasks.md` claimed were covered but were not (`delete-bookmark.test.js`, new describe blocks).** Reading the Build-Verify Log against the actual content of the existing test files found no case exercising F07-AC11 (the delete-triggered pagination clamp), F07-AC12 (a tag's disappearance from `GET /api/tags` once its last live bookmark is deleted), or F07-AC13 (the list emptying once the last live bookmark is deleted) — all three were asserted done in the log with no corresponding test anywhere in the suite. Result: **Pass**, all three, once written.
- **F08-TC02/TC03 — F08-AC2/AC3's rendered-DOM contract, automated (`app.spec.ts`, new describe block).** `lld.md` §11 named the structural toggle contract (aria-pressed/label/icon, no OS `prefers-color-scheme` detection) as testable only against `theme.store.spec.ts`'s mocked store, never against the actual rendered `app.html` template; this closes that gap with real DOM assertions against the mounted `App` component. Result: **Pass**.
- **F08-TC05 — F08-AC5/EC26's real-restart check, automated (`settings-route.test.js`, new describe block).** `lld.md` §11 explicitly carried the real stop/restart check for F08 to `/test-phase`, having tested only the mocked `ThemeStore` reconciliation at build time. This closes it with a genuinely file-backed SQLite connection (not `:memory:`), closed and reopened — the same proxy class F06-AC9/F07-AC14/AC15 already used. Result: **Pass**.

(The DNS-rebinding, EC19 restart fault-injection, and AMD-002 cheap-check tests are not counted here since they close gaps already named as open in `spec.md`/`lld.md`/`tasks.md`, not new AI-raised scenarios.)

## Fail -> Fix -> Retest

1. **`nfr05-timing.test.js`** — first run: `TypeError: Signature "test(name, fn, { ... })" was deprecated in Vitest 3 and removed in Vitest 4.` Cause: the new test passed `{ timeout: 8000 }` as an options object; Vitest 5 requires the bare number. Fix: changed to `it(name, fn, 8000)`. Retest: passed.
2. **`restart-integrity.test.js`** — first run: `AppError: You already saved this address.` on the AMD-002 cheap-check fixture. Cause: the input list included both `https://example.com` and `https://example.com/`, which `normalizeUrl` correctly folds to the same value per INV-02, so the second insert hit the real (correct) `DUPLICATE_URL` path the test wasn't expecting — a test-data defect, not a product defect. Fix: replaced the colliding URL with an independently-normalizing one. Retest: passed.

Both were fixed directly in-session as self-evident test-authoring bugs, with no application code touched. dev-1 confirmed both as test defects (not product defects) at the Testing gate approval (F01).

**F03 gate:** none. Both new test files (`nfr01-timing.test.js`, the injection-probe block in `list-route.test.js`) passed on first run; the one formatting pass needed (`prettier --write`) was style-only, not a test failure. Recorded plainly rather than inventing a failure to meet a guidance minimum.

**F02 gate:** none. Both new test additions (`tag-security-probe.test.js`, the new describe block in `tags-route.test.js`) passed on first run; the one formatting pass needed (`prettier --write`) was style-only, not a test failure. Fewer than 2 failures occurred this phase, recorded plainly rather than invented.

**F04 gate:** none. Both new test additions (the new NFR-01 describe block in `nfr01-timing.test.js`, the new describe block in `tag-security-probe.test.js`) passed on first run. Fewer than 2 failures occurred this phase, recorded plainly rather than invented.

**F06 gate:** One failure, unrelated to test content. The first `npx ng test --watch=false` (web) run crashed mid-suite: `Error: Worker exited unexpectedly with signal SIGTERM during stopping state while running test file .../relative-time.spec.ts` — a transient Vitest worker crash, not a test assertion failure (an earlier background terminal from this same session was still finishing an `eslint --fix` pass and likely contended for resources). Fix: none needed in test content; simply re-ran the identical command. Retest: **15 test files, 207 passed (207), 0 failed** — clean on the immediate retry, confirming the first run was an environment flake, not a defect. All three new api test additions (`edit-bookmark.test.js`'s two new describe blocks, `restart-integrity.test.js`'s new describe block) passed on their first run with no fix needed.

**F05 gate:** none. No new test files were needed — all AC/EC coverage was already written during build — so there was nothing to fail. Fewer than 2 failures occurred this phase, recorded plainly rather than invented.

**F07 gate:** none. All five new test blocks (F07-AC11–AC15) passed on the first run against the existing, unmodified application code. Fewer than 2 failures occurred this phase, recorded plainly rather than invented. Separately, this phase found that `tasks.md`'s Build-Verify Log had **misreported** coverage for F07-AC14/AC15 — recorded here as a documentation accuracy gap found during testing, not a code defect or a test failure.

**F08 gate:** One failure. `app.spec.ts`'s new AC3 click-toggle test called `http.expectOne('/api/settings/theme')`, filtering on URL only; this matched 2 pending requests at once — the `App` constructor's own unflushed `theme.load()` `GET` (fired on component creation, never flushed in that test) plus the test's own `PUT` from clicking the toggle. Fix: matched on `{ url: '/api/settings/theme', method: 'PUT' }` instead of URL alone. Retest: **15 test files, 211 passed (211), 0 failed**. The new `settings-route.test.js` restart-proxy test passed on its first run with no fix needed.

## AI Interactions

### Evidence E-testing-101

**SDLC activity:** testing

**Task/feature:** F01-add-bookmark — close the declared test-phase gaps named in `spec.md` §3, `lld.md` §11/§12 and `tasks.md`'s Build-Verify Log: the DNS-rebinding half of F01-EC2, EC19 (restart mid-write), the AMD-002 §4 cheap check, a real (non-simulated) NFR-05 measurement, and an S4/NFR-04 SQL-metacharacter probe specific to F01 (no prior F01 test injected one).

**Context given to AI:** `spec.md`, `lld.md`, `tasks.md` (Build-Verify Log), `product-spec.md` NFR-04/NFR-05, `component-map.json` test commands, and the full existing `app/api/test/` suite (266 passing tests) were read first so no case would duplicate existing coverage.

**Prompt/request:** `/test-phase F01` — write and run the tests for the feature's declared-open and fault-injection items, after presenting a test plan preview and receiving `GO`.

**AI response summary:** Proposed four new test files — `nfr05-timing.test.js` (real wall-clock budget check against a genuinely unresponsive loopback server), `ssrf-rebinding.test.js` (a lookup double whose second answer for the same host is private, proving the fetcher never re-resolves between check and connect), `restart-integrity.test.js` (an aborted-transaction proxy for EC19, plus the AMD-002 §4 trailing-slash check against real SQLite rows), and `injection-probe.test.js` (a `'; DROP TABLE bookmark; --` payload in title, user title and URL query string).

**Your decision:** Accepted

**What you changed and why:** Nothing changed.

**How you verified it:** Ran `npx vitest run` in `app/api`: **275 passed (275)**, 13 test files, 0 failed. Ran `npx vitest run --coverage`: 95.49% stmts / 86.61% branch / 98.02% lines over `src/services` + `src/lib` (Q4 target 80%, unchanged from the build gate's 95.21%/86.61%). Ran `npx eslint . --fix` (exit 0) and `npx prettier --check .` (`All matched files use Prettier code style!`) after the new files were added. Separately ran only `test/nfr05-timing.test.js` with a temporary `console.log` to capture the real observed elapsed time — `elapsedMs=5016` — then removed the debug line and re-ran the full suite to confirm it was still green.

**Outcome:** worked

**Iteration:** Two test-authoring defects were found and fixed during this same session before the final green run — see E-testing-102 for the Fail → Fix → Retest record.

**Approx. time:** TODO(human)

**Learning:** TODO(human)

### Evidence E-testing-102

**SDLC activity:** testing

**Task/feature:** F01-add-bookmark — Fail → Fix → Retest during authoring of the new test-phase files (E-testing-101).

**Context given to AI:** The four new test files from E-testing-101, run for the first time against the existing `api` codebase (no application code was touched in this session).

**Prompt/request:** Run the new tests (`npx vitest run`) as part of executing the test plan.

**AI response summary:** First run reported `Test Files 2 failed | 11 passed (13)`, `Tests 1 failed | 273 passed (274)`, plus one whole suite failing to collect. Failure 1 — `test/nfr05-timing.test.js`: `TypeError: Signature "test(name, fn, { ... })" was deprecated in Vitest 3 and removed in Vitest 4. Please, provide options as a second argument instead.` — a Vitest 5 API-shape bug in the new test file itself (passed `{ timeout: 8000 }` as an options object where the installed Vitest version requires the bare number `8000`). Failure 2 — `test/restart-integrity.test.js` > the AMD-002 cheap-check test: `AppError: You already saved this address.` — the test's own input list included both `https://example.com` and `https://example.com/`, which `normalizeUrl` (correctly, per INV-02) folds to the same value, so the second `create()` call hit the real `DUPLICATE_URL` path the test was not expecting; a test-data defect, not a product defect (the product behaved exactly as INV-02 specifies).

**Your decision:** Modified

**What you changed and why:** These were code-review-obvious test-authoring mistakes (a wrong Vitest call signature; a test fixture that accidentally exercised the duplicate-detection code it wasn't testing) discovered and fixed by the tester directly in this same session, with no application code changed. Per `testing-standards`, the tester may fix a test defect only when the human agrees it is a test defect and not a product one — dev-1 confirmed this agreement at the Testing gate approval.

**How you verified it:** Fixed the timeout argument to the bare-number form Vitest 5 expects, and replaced the colliding input with two independently-normalizing URLs. Re-ran `npx vitest run`: `Test Files 13 passed (13)`, `Tests 275 passed (275)`, 0 failed.

**Outcome:** worked

**Iteration:** Confirmed by dev-1 at the Testing gate: both failures were test-authoring defects, not product defects.

**Approx. time:** TODO(human)

**Learning:** TODO(human)

### Evidence E-testing-103

**SDLC activity:** testing

**Task/feature:** F01-add-bookmark — the two manual checks that automated tests cannot perform, carried over as open items from the build gate: F01-AC16 (rendered-in-page confirmation that a script-like title is inert) and F01-AC17 (full keyboard-only walkthrough of the add-bookmark flow).

**Context given to AI:** `spec.md` AC16 ("a title containing `<script>` or similar markup is stored and displayed as literal text, never executed") and AC17 (keyboard operability), plus the automated coverage already in place: `bookmark-service.test.js`/`bookmarks-route.test.js` prove the literal string is stored and returned unescaped over the API, and Angular's template binding is relied on for safe DOM rendering, but neither proves what actually renders in a browser.

**Prompt/request:** Asked the human to run the app, add a bookmark with a script-like title, and confirm (a) no script executes and (b) the title appears as literal visible text; and separately to complete a keyboard-only walkthrough of add/edit/delete.

**AI response summary:** Relayed the two manual steps and waited for the human's observed results rather than assuming a pass.

**Your decision:** Accepted

**What you changed and why:** N/A — no code changed for this record; it documents manual verification results as given.

**How you verified it:** Human-reported results, quoted verbatim: "1. F01-AC17 - Pass" and "2. F01-AC16 - no alert/script execute, can not verify the first one at this moment." This is read as: AC17 fully confirmed; AC16's non-execution half confirmed, its literal-text-rendering half **not yet confirmed** (recorded as Not run, not Pass).

**Outcome:** partially worked

**Iteration:** F01-AC16's literal-text-rendering visual confirmation remains open; carried into the Test Matrix as "Not run" and into Known Limitations rather than assumed.

**Approx. time:** TODO(human)

**Learning:** TODO(human)

### Evidence E-testing-307

**SDLC activity:** testing

**Task/feature:** F03-list-bookmarks — the two items `spec.md` §4, `lld.md` §11/§13, and `status.md`'s Testing row all name as deliberately not yet executed: the NFR-01 1,000-record timed list measurement, and a dedicated NFR-04/S4 SQL-injection-shaped probe aimed directly at the `page`/`size` query parameters (the fields that feed `LIMIT`/`OFFSET`).

**Context given to AI:** `spec.md` §4 (NFR-01 is F03's primary owner, "measured, not estimated"), `data-model.md` §6's seeding recipe (`https://example.com/article/{n}`, ~20 tags with 0–8 each, spread `created_at`), `lld.md` §9's security table (page/size bound as integers, never string-built), and the existing `pagination.test.js`/`list-route.test.js` suites (to avoid duplicating the already-covered clamp-table and the one existing unrelated-param probe).

**Prompt/request:** `/test-phase F03-list-bookmarks` — after presenting a test plan and receiving `GO`, write and run the NFR-01 timing test and the injection-shaped probe.

**AI response summary:** Proposed and wrote `test/nfr01-timing.test.js` (a real HTTP server over a real in-memory SQLite connection, seeded with exactly 1,000 synthetic rows per the data-model.md recipe, timing 20 real requests each at page 1 and the last page) and a new `describe` block in `test/list-route.test.js` covering five page-field and three size-field SQL-injection-shaped payloads (e.g. `1' OR '1'='1`, `1;DROP TABLE bookmark;--`), asserting each still returns 200 with the documented clamp fallback and that the `bookmark` table survives intact.

**Your decision:** Accepted

**What you changed and why:** Nothing changed after the human review; both files were accepted as written.

**How you verified it:** Ran `npx vitest run test/nfr01-timing.test.js --reporter=verbose` in isolation to capture the real observed numbers: page=1&size=20 — median=15ms, max=51ms (n=20); page=50&size=20 (last page) — median=12ms, max=21ms (n=20); both well under the 1,000ms target. Ran the full suite `npx vitest run`: **15 test files, 319 tests passed, 0 failed**. Ran `npx vitest run --coverage`: 96.14% stmts / 87.2% branch / 93.22% funcs / 98.49% lines over `src/services` + `src/lib` (Q4 target 80%). Ran `npx eslint . --fix` (0 errors after fix) and `npx prettier --write`/`--check .` (one formatting pass needed on the two new files, then "All matched files use Prettier code style!"), followed by a final `npx vitest run` re-confirming **319/319** passed after the formatting pass.

**Outcome:** worked

**Iteration:** None — no failure occurred in this session's first run of either new file.

**Approx. time:** TODO(human)

**Learning:** TODO(human)

### Evidence E-testing-308

**SDLC activity:** testing

**Task/feature:** F03-list-bookmarks — F03-AC7 / NFR-02, the restart-correctness check, re-run at the full 1,000-record volume with two real process restart cycles (the build gate's spot check used only 15–22 rows and a single restart; this phase's check proves it holds at the volume NFR-01 itself requires).

**Context given to AI:** `spec.md` F03-AC7 ("both pages return the identical items... and the identical total as before the restart") and `product-spec.md` NFR-02's measurement method ("stop the application, restart it, and compare the full list against the expected set"); `data-model.md` §6's seeding recipe; `component-map.json`'s `api.dataStore.location` (`app/api/data/tagvault.db`) and `start` command (`node src/server.js`).

**Prompt/request:** `/test-phase F03-list-bookmarks` — execute the real restart-at-scale check described in the test plan preview.

**AI response summary:** Wrote a one-off seed script inserting 1,000 synthetic bookmarks (`https://example.com/article/{n}`) directly into the real on-disk SQLite file, stopped a leftover dev-server process already holding port 3000, then ran three full process cycles: start → capture page 1 and page 100 (size 10) + total → stop → start → capture and diff against the first capture → stop → start → capture and diff again.

**Your decision:** Accepted

**What you changed and why:** Nothing changed — the check ran exactly as planned across all three process starts.

**How you verified it:** Captured JSON responses to files and diffed them with `Compare-Object`. Run 1 (pre-restart baseline): `total=1000`, page1 first id=1024, page100(size10) returned 10 items, first id=34. Run 2 (after restart cycle 1): `total=1000`, **0** line differences against run 1 on both page 1 and the last page. Run 3 (after restart cycle 2): `total=1000`, **0** line differences against run 1 on both page 1 and the last page. Cleaned up the scratch JSON files, the ad-hoc seed script, and reset `app/api/data/` afterward (synthetic data only, D1).

**Outcome:** worked

**Iteration:** None — both restart cycles matched the baseline on the first attempt.

**Approx. time:** TODO(human)

**Learning:** TODO(human)

### Evidence E-testing-201

**SDLC activity:** testing

**Task/feature:** F02-tag-bookmarks — write and run the test plan: re-run all 13 AC + 8 EC cases already automated by the builder, plus two new AI-proposed security probes closing gaps `testing-standards`/`secure-input-handling` flag as not yet covered (attack-shaped tag payloads over real HTTP, and a literal-`_`-in-prefix proof against a real database).

**Context given to AI:** `spec.md` (13 AC, 8 EC), `lld.md` §7 (validation rules), §9 (security table), §11 (test hooks), `tasks.md`'s Build-Verify Log (364 prior passing tests across both components), `product-spec.md` NFR-03/NFR-04, `component-map.json` test/coverage commands, and the full existing F02 test files (`tag-service.test.js`, `tags-route.test.js`, `tag-repository.test.js`, the F02 additions in `bookmark-service.test.js`, `tag-chip.spec.ts`, `bookmarks.store.spec.ts`, `tag-input.spec.ts`, `bookmark-form.spec.ts`) read first to avoid duplicating any case.

**Prompt/request:** `/test-phase F02-tag-bookmarks` — after presenting a test plan preview and receiving `GO`, write and run the two new probe cases and re-run the full regression.

**AI response summary:** Added `test/tag-security-probe.test.js` (a SQL-metacharacter tag payload and an XSS-shaped tag payload, both asserted `400 INVALID_TAG` with zero rows written and both `bookmark`/`tag` tables intact afterward, plus one positive-path twin proving a valid tag round-trips literally) and one new `describe` block in `test/tags-route.test.js` (a tag named `a_bc` vs. `a1bc`, proving a prefix containing a literal `_` matches only the literal tag, never as a SQL `LIKE` wildcard — S6).

**Your decision:** Accepted

**What you changed and why:** Nothing changed after review; both additions were accepted as written.

**How you verified it:** Ran `npx vitest run` in `app/api`: **20 test files, 364 tests passed, 0 failed**. Ran `npx vitest run --coverage`: **96.93% stmts / 88.84% branch / 96.92% funcs / 99.17% lines** over `src/services` + `src/lib` (Q4 target 80%). Ran `npx prettier --check .` (one file needed `--write`, then re-checked clean) and `npx eslint . --fix` (0 errors). Ran `npx ng test --watch=false` in `app/web` (no web test files changed this phase): **8 test files, 116 tests passed, 0 failed** — unchanged from the Build gate baseline. Started `node src/server.js` and confirmed the full smoke contract: `GET /api/health`, `GET /api/bookmarks`, `GET /api/tags` → 200/200/200.

**Outcome:** worked

**Iteration:** One formatting pass needed on the new probe file (`prettier --write`); re-ran the full suite afterward to confirm still 364/364. No test failure occurred.

**Approx. time:** TODO(human)

**Learning:** TODO(human)

### Evidence E-testing-401

**SDLC activity:** testing

**Task/feature:** F04-filter-by-tag — close the two test-phase gaps named in `spec.md` §4 and `lld.md` §11: the NFR-01 tag-filter timing measurement (not yet measured at 1,000 seeded bookmarks), and a dedicated security probe on the tag **filter/read** path (`GET /api/bookmarks?tag=`), distinct from the existing write-path probe (`tag-security-probe.test.js`) which only covers F02's `POST` tag validation.

**Context given to AI:** `spec.md` (12 AC, 7 edge cases), `lld.md` §9/§11 (security table, test hooks), `tasks.md`'s Build-Verify Log (every F04 task's existing test coverage), `product-spec.md` NFR-01, `component-map.json` test commands, and the full existing F04 test files (`list-query.test.js`, `bookmark-service.test.js`, `bookmarks-route.test.js`, `bookmarks.store.spec.ts`, `tag-rail.spec.ts`, `bookmark-list.spec.ts`) read first to confirm AC1-10, AC12 and all 7 edge cases already had an existing, passing automated test, so nothing would be duplicated.

**Prompt/request:** `/test-phase F04` — after presenting a test plan preview and receiving `GO`, write and run the NFR-01 tag-filter timing test and the tag-filter read-path security probe, then re-run the full regression.

**AI response summary:** Added one new `describe` block to the existing `nfr01-timing.test.js` (reusing its established 1,000-row/20-tags seed) timing 20 real `GET /api/bookmarks?tag=tag-5&size=20` requests against the real HTTP server. Added one new `describe` block to the existing `tag-security-probe.test.js` sending a SQL-metacharacter string and an XSS-shaped string as the `?tag=` value directly, asserting `200 {items:[],total:0,page:1,size:20}` (never 400/500) and that the `bookmark`/`tag` tables survive intact.

**Your decision:** TODO(human)

**What you changed and why:** TODO(human)

**How you verified it:** Ran `npx vitest run test/nfr01-timing.test.js --reporter=verbose` in isolation to capture the real observed numbers: `tag=tag-5&size=20` — median=15ms, max=23ms (n=20), well under the 500ms NFR-01 target. Ran the full `api` suite: `npx vitest run` → **30 test files, 506 tests passed, 0 failed**. Ran the full `web` suite: `npx ng test --watch=false` → **15 test files, 207 tests passed, 0 failed**. F04-AC11's keyboard walkthrough was not re-run this phase; its result is cited verbatim from the Build gate (F04-T12, dev-1 confirmed pass 2026-10-01), since no UI code changed since.

**Outcome:** worked

**Iteration:** None — both new test blocks passed on the first run; no failure occurred this phase.

**Approx. time:** TODO(human)

**Learning:** TODO(human)

### Evidence E-testing-601

**SDLC activity:** testing

**Task/feature:** F06-edit-bookmark — close the two items `lld.md` §11 explicitly carried to `/test-phase` (the real multi-process restart check for an edited row, F06-AC9; the real, non-manual automation of F06-AC7's ordering guarantee), plus a new AI-proposed security probe aimed at the edit path specifically (no existing test probed `PUT /api/bookmarks/:id` with attack-shaped input; F01's `injection-probe.test.js` only covers `POST`).

**Context given to AI:** `spec.md` (13 AC, 6 edge cases), `lld.md` §4/§7/§9/§11 (contract, validation order, security table, declared-open test hooks), `tasks.md`'s Build-Verify Log (422 prior api / 167 prior web passing tests at the Build gate, all 13 AC already covered by `edit-bookmark.test.js`/`edit-conflict.test.js`/web specs except AC7's automation and AC9's real-restart form), `product-spec.md` NFR-02/NFR-03, `component-map.json` test commands, and the full existing F06 test files read first to avoid duplicating any case already written by the builder.

**Prompt/request:** `/test-phase F06-edit-bookmark` — after presenting a test plan preview and receiving `GO`, write and run the two declared-open test-hook items and the new security probe, then re-run the full regression for both components.

**AI response summary:** Added a new `describe` block to `edit-bookmark.test.js` (F06-AC7: create an older row X and a newer row Y, edit only X's title, assert `service.list()` still returns `[Y, X]` in that order). Added a new `describe` block to `restart-integrity.test.js` (F06-AC9: a real file-backed SQLite connection in a temp directory, create then edit a row, close the connection, reopen it fresh, assert the edited values — not the pre-edit ones — are returned with `created_at` unchanged). Added a new `describe` block to `edit-bookmark.test.js`'s `PUT` route-level suite (a SQL-metacharacter title, a SQL-metacharacter URL query string, and a SQLi-shaped `:id` route parameter, each asserting the payload is inert and the `bookmark` table survives).

**Your decision:** Accepted

**What you changed and why:** Nothing changed after review; all three additions were accepted as written and the Testing gate was approved as presented.

**How you verified it:** Ran `npx prettier --write .` and `npx eslint . --fix` in `app/api` (clean, 0 errors). Ran `npx vitest run --coverage`: **30 test files, 511 tests passed, 0 failed**; coverage 97.05% stmts / 90.27% branch / 96.25% funcs / 98.87% lines over `src/services` + `src/lib` (Q4 target 80%). Ran `npx prettier --write .` and `npx eslint . --fix` in `app/web` (clean, 0 errors; no web test files were changed this phase). Ran `npx ng test --watch=false`: first attempt crashed with a transient Vitest worker `SIGTERM` unrelated to any test's content; immediate retry passed clean — **15 test files, 207 tests passed, 0 failed**, unchanged from the F04 gate's web baseline.

**Outcome:** worked

**Iteration:** One environment-level retry on the web suite (worker crash, not a test failure) — recorded in Fail -> Fix -> Retest. No api test failed on first run.

**Approx. time:** TODO(human)

**Learning:** TODO(human)

### Evidence E-testing-504

**SDLC activity:** testing

**Task/feature:** F05-search — re-run the full `api`/`web` regression (all 13 AC and 9 edge cases were already covered by tests written during build), capture an isolated NFR-01 search-timing measurement at 1,000 seeded bookmarks, and build the Test Matrix.

**Context given to AI:** `spec.md` (13 AC, 9 edge cases, NFR-01/03/04), `lld.md`, `tasks.md`'s Build-Verify Log (confirming every AC/EC already had a passing test from the build phase), `component-map.json` (`api`/`web` test commands), and the existing `nfr01-timing.test.js` (its F05 search-query case, added at build time per F05-T04).

**Prompt/request:** `/test-phase F05` — after presenting a test plan preview (no new test files planned, since coverage was already complete) and receiving `GO`, run the full suites and the isolated NFR-01 search case.

**AI response summary:** Ran `npx vitest run` (api, 30 files/511 tests) and `npx ng test --watch=false` (web, 15 files/207 tests), both fully passing. Ran `nfr01-timing.test.js` in isolation with `--reporter=verbose` to capture the console.log timing line: search query (`q=bookmark&size=20`) median=14ms, max=25ms over 20 real requests. Built a 17-row Test Matrix covering all 13 AC and 6 new + 3 inherited edge cases. Flagged a threshold mismatch: `spec.md` implies F05 co-owns a <500ms NFR-01 target with F04, but the test file's own assertion is <1000ms (matching F03's list-page budget, not F04's tag-filter test's <500ms). The observed numbers pass either threshold.

**Your decision:** Accepted

**What you changed and why:** Recorded all results in `status.md`'s Test Matrix and Known Limitations; did not modify `nfr01-timing.test.js`'s assertion — a threshold change is a builder/reviewer decision, not the tester's to make unilaterally.

**How you verified it:** Observed directly from command output: `npx vitest run` (511/511 passed), `npx vitest run test/nfr01-timing.test.js --reporter=verbose` (4/4 passed, console.log showed median=14ms max=25ms), `npx ng test --watch=false` (207/207 passed).

**Outcome:** worked — all 511 api + 207 web tests passed; 17/17 planned test matrix cases observed Pass; 0 Fail; one non-blocking finding recorded for the reviewer.

**Iteration:** none needed — no failures to fix/retest this phase.

**Approx. time:** TODO(human)

**Learning:** TODO(human)

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

### Evidence E-testing-801

**SDLC activity:** testing

**Task/feature:** F08-dark-mode — close the two gaps `lld.md` §11 explicitly carried forward to `/test-phase`: F08-AC2/AC3's rendered-DOM contract for the header toggle (aria-pressed/aria-label/icon, no OS `prefers-color-scheme` detection) had no structural assertion anywhere, and F08-AC5/EC26's restart persistence had only a mocked `ThemeStore` reconciliation test, never a real file-backed close/reopen proxy (the pattern already established by F06-AC9/F07-AC14/AC15).

**Context given to AI:** `spec.md` (10 AC, 6 edge cases), `lld.md` §3/§4/§6/§8/§11 (component changes, contract, UI states, error handling, test hooks), `tasks.md`'s Build-Verify Log, `product-spec.md` NFR-02/NFR-03/NFR-04, `component-map.json` test commands, and the full existing F08 test files (`setting-repository.test.js`, `setting-service.test.js`, `settings-route.test.js`, `theme.store.spec.ts`) plus `app.spec.ts`, `app.html`/`app.ts`, `index.html`, and `restart-integrity.test.js`'s F06-AC9 proxy pattern, all read end-to-end before writing anything.

**Prompt/request:** `/test-phase F08` — after presenting a test plan preview naming the two gaps (AC2/AC3 structural, AC5/EC26 restart proxy) and the AC7 manual keyboard walkthrough, received `GO`, wrote and ran the new tests, then asked the human to perform the walkthrough.

**AI response summary:** Added a new `F08-AC2/AC3 — header theme toggle wiring` describe block to `app.spec.ts` (3 cases: initial render is light with `aria-pressed="false"`/label `"Dark mode"`; a click flips to dark with `aria-pressed="true"`/label `"Light mode"`/`<html data-theme="dark">`; the toggle is a native `<button>` with no custom `tabindex`, reachable by `Tab`), plus a `beforeEach` reset of `document.documentElement.dataset.theme` so the suite is order-independent. Added a new `F08-AC5 / EC26` describe block to `settings-route.test.js`: a real on-disk SQLite file (not `:memory:`), `PUT` to set `dark`, the listener and db connection both closed, then a fresh `createApp`/`createDb` against the same file and a `GET` confirming `{ theme: 'dark' }` survives — the same close/reopen proxy `restart-integrity.test.js` already uses for F06-AC9. One failure found and fixed on the first run: the AC3 click test's `http.expectOne('/api/settings/theme')` matched 2 pending requests (the app constructor's own unflushed `theme.load()` GET plus the test's `PUT`) because it filtered on URL only; fixed by matching `{ url: '/api/settings/theme', method: 'PUT' }`. Re-ran and it passed.

**Your decision:** Accepted

**What you changed and why:** Nothing changed after review; all four new test cases were accepted as written and the Testing gate was approved as presented.

**How you verified it:** Ran `npx prettier --write` / `npx eslint . --fix` on both edited files (0 errors). Ran the full `api` suite: `npx vitest run` → **30 test files, 517 tests passed, 0 failed** (up from 516 before this phase). Ran `npx vitest run --coverage` (api): **97.13% stmts / 90.53% branch / 96.34% funcs / 99.05% lines** over `src/services` + `src/lib` (Q4 target 80%). Ran the full `web` suite: `npx ng test --watch=false` — first attempt had 1 failure (the `expectOne` ambiguity above); fixed, reformatted, re-ran: **15 test files, 211 tests passed, 0 failed** (up from 207 before this phase). `npx ng test --coverage --watch=false` failed outright with "Code coverage requires either @vitest/coverage-v8 or @vitest/coverage-istanbul to be installed" — the package is not installed in this workspace and no prior F01-F07 testing gate ran it either (all prior gates measured coverage on `api` only); recorded as a known limitation, not a failure, consistent with that established precedent. dev-1 performed the F08-AC7 keyboard walkthrough (Tab to the toggle, visible focus outline, Enter to flip to dark, Tab away and back, Space to flip back to light) against the live running app and confirmed: "passed."

**Outcome:** worked

**Iteration:** One Fail -> Fix -> Retest this phase: the AC3 click test's ambiguous `expectOne` match, fixed by matching on `method` as well as `url`; retest passed.

**Approx. time:** TODO(human)

**Learning:** TODO(human)

### Evidence E-testing-001

**SDLC activity:** testing

**Task/feature:** app — the one app-level gap no feature gate could close in isolation: proof that the eight features compose correctly across one continuous user session, plus a full regression re-run and smoke check before the app-level testing gate.

**Context given to AI:** `specs/backlog.md` (all 8 features `done`), `component-map.json` (api/web test + smoke commands), `product-spec.md` NFR-01..05 (all already measured per-feature, cited in Test Strategy above), and the full existing `app/api/test/` + `app/web/src/` suites, read first to confirm no app-level journey test already existed.

**Prompt/request:** `/test-phase app` — after presenting a test plan preview and receiving `GO`, write and run one new cross-feature journey test, then re-run the full regression and smoke check for both components.

**AI response summary:** Added `test/app-journey.test.js`: a single test threading F01 (add two tagged bookmarks) → F03 (list order/shape) → F04 (tag filter, including the narrowing effect of an F06 edit) → F05 (search by title) → F06 (edit title+tags) → F07 (delete then restore) → F08 (theme default, flip, persist) → F02 (tag suggestions reflect final live state), all against one real HTTP server and one real in-memory SQLite connection.

**Your decision:** Accepted

**What you changed and why:** Nothing changed after review; the test was accepted as written.

**How you verified it:** First run failed: `TypeError: Cannot read properties of undefined (reading 'sort')` — the test read `r1.json()` directly where the route actually wraps the payload as `{ bookmark }` and names the field `updated_at`, not `updatedAt`. These were test-authoring defects (wrong assumed response shape), confirmed against `src/routes/bookmarks.js`'s actual `res.status(201).json({ bookmark })`. Fixed by reading `.bookmark` and `.updated_at`, and by reading `GET /api/tags?prefix=` as a bare array (`tagService.suggest()`'s actual return shape, confirmed in `src/routes/tags.js`) rather than `{tags:[]}`. Re-ran in isolation: `npx vitest run test/app-journey.test.js` → **1 passed (1)**. Ran the full `api` suite: `npx vitest run --coverage` → **31 test files, 518 passed (518), 0 failed**; coverage 97.34%/90.85%/97.56%/99.29% over `src/services`+`src/lib` (Q4 target 80%). Ran the full `web` suite: `npx ng test --watch=false` → **16 test files, 212 passed (212), 0 failed**. Ran `npx prettier --write` / `npx eslint . --fix` on the new file (0 errors). Started `node src/server.js` and confirmed the smoke contract: `GET /api/health` → 200, `GET /api/bookmarks` → 200, `GET /api/tags` → 200.

**Outcome:** worked

**Iteration:** One Fail → Fix → Retest this phase (wrong assumed response-field names in the new test itself, not a product defect); retest passed. Recorded as the only failure this phase since fewer than 2 occurred.

**Approx. time:** TODO(human)

**Learning:** TODO(human)

## Known Limitations

- **The app-level cross-feature journey test (`app-journey.test.js`) covers one linear happy-path sequence only** — it is not a substitute for each feature's own AC/EC matrix (all already exercised and cited per-feature above), only a proof that the features compose without interference when threaded together against one shared database.
- **F05's `nfr01-timing.test.js` search-query assertion is looser than `spec.md` §4 implies.** F05's search-query test instead asserts `<1000ms` (matching F03's list-page budget). The observed numbers (median=14ms, max=25ms) pass either threshold, so the Pass outcome is unaffected, but the assertion itself may warrant tightening for consistency — flagged for `/review-phase`, not changed by the tester.
- **F05-AC12's keyboard walkthrough was cited, not re-run this phase** — human-confirmed against the live app at the Build gate (F05-T14, final attempt, 2026-10-01: "Great job, its fixed now"); nothing in the search-box UI changed since.
- **F01-AC16's "renders as visible literal text" half is Not run.** dev-1 confirmed no script executes, but not that the text is visibly rendered — this stays Not run until independently confirmed; do not treat it as Pass.
- **F01-AC15/NFR-02 persistence was not independently re-executed this phase.** Cited from the Build gate's real stop/start check (byte-identical result, `tasks.md` T12) since no persistence-path code has changed.
- **DNS-rebinding coverage uses an injected `lookup` double, not a real second DNS resolution against live infrastructure** — the closest testable proxy per `lld.md` §11's seam design; a genuine network-level rebinding attack isn't reproducible in this test environment.
- **EC19 (restart mid-write) is tested as an aborted in-process transaction, not a real process kill** — a real kill can't be driven from a test; the transaction-abort proxy is the declared approach.
- **Trailing-dot hostname gap (`lld.md` §12) remains open by design** — re-confirmed still present via the existing `url-normalize.test.js` pinning test; not a new finding, not fixed this phase.
- **F03 EC22's "filter/search stays applied" half and EC23 (delete-triggered re-fetch) remain untestable** until F04/F05/F07 exist — exactly as `spec.md` §3 already names, carried forward unchanged.
- **F03-AC9's keyboard walkthrough is cited, not re-run this phase** — human-confirmed against the live app at the Build gate (2026-10-01); nothing in the list/pagination UI changed since.
- **F03's 1,000-record restart check used an ad-hoc seed script and the real dev database file**; the script and scratch comparison files were deleted and `app/api/data/` was reset to empty afterward (synthetic data only, D1).
- **F02-AC10's native `<datalist>` cosmetic styling** was flagged at the Build gate (F02-T12) as a finding for `/review-phase`, not a test failure; the functional keyboard/ARIA contract passed.
- **spec.md's `prefix=DA` example (F02-AC11)** is internally inconsistent with the implemented plain-prefix-match algorithm (flagged by the builder at F02-T05); this phase's `tags-route.test.js` asserts the correct, consistent behavior instead — still open for a spec.md correction via `/amend-architecture` or a planner revision, not something testing can silently fix.
- **NFR-01/NFR-02 do not apply to F02** per `spec.md` §4 (only NFR-03/NFR-04 are listed) — not tested this phase by design, not an oversight.
- **F02-AC10's manual keyboard walkthrough was cited, not re-run this phase** — human-confirmed against the live app at the Build gate (F02-T12, 2026-10-01); nothing in the tag-input UI changed since.
- **F04-AC11's manual keyboard walkthrough was cited, not re-run this phase** — human-confirmed against the live app at the Build gate (F04-T12, 2026-10-01); nothing in the tag-rail/active-filter-chip UI changed since.
- **F04-EC17's trigger (the delete action that empties a tag's last bookmark) is simulated via a direct soft-delete/stubbed-response fixture, not F07's real delete flow**, since F07 does not exist yet — exactly as `spec.md` §5 already names; F04 owns only the rail's and the active filter's reaction once a tag reaches zero live bookmarks.
- **F06-AC11's "two tabs" scenario is simulated as two sequential `service.update()` calls against one `:memory:` db, not two genuinely concurrent browser contexts** — declared in `lld.md` §11 as the chosen proxy, not an oversight; no real multi-tab/multi-process race was driven.
- **F06-AC9's restart check closes and reopens a real file-backed SQLite connection in-process, rather than stopping and restarting the actual Node.js server process** — the same class of substitution F01's EC19 fault-injection test already uses; F03's gate separately proved the full process-restart case holds at 1,000 records for the (unedited) list path, so this is judged a reasonable, declared proxy rather than a full re-proof.
- **F06-AC13's keyboard walkthrough was cited, not re-run this phase** — human-confirmed against the live app at the Build gate (F06-T11, 2026-10-01, including the F03 View-existing defect fix verified in the same walkthrough); nothing in the edit-dialog UI changed since.
- **`tasks.md`'s Build-Verify Log misreported F07-AC14/AC15 coverage.** The log's Done-when text for F07-T05/T06 claimed both files already included the restart-integrity checks; reading the files end to end during this phase found neither did. Both checks were written and run fresh this phase (F07-TC14, F07-TC15) — flagged here as a documentation-accuracy finding for `/review-phase`, not silently corrected in `tasks.md` by the tester.
- **F07-AC9's "double-activation" race is exercised with `Promise.all` over two real concurrent HTTP requests (api) and two synchronous clicks before `fixture.detectChanges()` (web), not a genuine browser-level double-click timing race** — the same class of declared proxy F01's EC18/F06's EC21 already use; both are judged sufficient to prove the server-side `WHERE ... AND deleted_at IS NULL` guard and the client-side `confirming` disable-on-first-click guard each do their job independently.
- **F07-AC14/AC15's restart checks close and reopen a real file-backed SQLite connection in-process, rather than stopping and restarting the actual Node.js server process** — the same declared proxy class F06-AC9 already used, not a new limitation introduced this phase; F03's gate separately proved the full process-restart case holds at 1,000 records for the (unrelated) list path.
- **F08-AC5/EC26's restart check closes and reopens a real file-backed SQLite connection in-process, rather than stopping and restarting the actual Node.js server process** — the same declared proxy class F06-AC9/F07-AC14/AC15 already used, not a new limitation introduced this phase.
- **Web-side code coverage was not measured for F08 (or any prior feature)** — `@vitest/coverage-v8`/`@vitest/coverage-istanbul` is not installed in this workspace; every F01–F08 testing gate measured `api` coverage only, consistent with `vitest.config.js`'s coverage scope being declared over `src/services`+`src/lib` (api-only, per HLD §5).

