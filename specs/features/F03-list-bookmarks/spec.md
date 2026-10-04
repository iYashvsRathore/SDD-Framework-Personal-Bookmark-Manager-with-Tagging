# F03: List Bookmarks (Spec)

**Feature ID:** F03-list-bookmarks
**Owner:** dev-1
**Status:** approved
**Approved:** 2026-10-01 by dev-1
**Requirements covered:** R03 (full), R15 (full), R08 (partial — a restarted app still lists correctly), R11 (partial — empty-list and list-fetch-error states; no-results and empty-tag-filter states belong to F05 and F04)
**Components affected:** `api`, `web`
**Depends on:** F01
**Constitution version:** 1.0.0

## 1. User Stories

- **F03-US1:** As Priya, I want to see all my saved bookmarks with the newest one first, so that I can quickly find what I saved most recently.
- **F03-US2:** As Priya, I want to choose how many bookmarks appear on a page — 10, 20 or 50 — so that I can control how much I scroll versus how often I click through pages.
- **F03-US3:** As Priya, I want a clear message and a way to add my first bookmark when I have none saved yet, so that I am not looking at a blank screen wondering if something is broken.
- **F03-US4:** As Priya, I want the list to stay fast and correct even after I have saved hundreds of links, so that the app still feels usable as my collection grows.
- **F03-US5:** As Priya, I want the bookmarks I saved to still appear in the same order after I stop and restart the app, so that I can trust the list is accurate.

## 2. Acceptance Criteria (testable)

| AC ID | Given | When | Then |
|---|---|---|---|
| F03-AC1 | Three bookmarks exist, saved at three distinct instants | `GET /api/bookmarks` is called with no query parameters | **200**; body is `{ items, total, page, size }`; `items` are ordered newest `created_at` first, ties broken by `id DESC`; the list screen's count region (`#count`, `aria-live="polite"`) reads `3 bookmarks` |
| F03-AC2 | No bookmarks are saved | The list screen loads | `GET /api/bookmarks` returns **200** `{ items: [], total: 0, page: 1, size: 20 }`; the screen shows the empty state with heading `No bookmarks yet`, the explanatory text `Save your first link, then add a tag or two so it is easy to find later.`, and a primary *Add bookmark* action that opens F01's add dialog |
| F03-AC3 | 25 bookmarks are saved | `GET /api/bookmarks` is called with no `page` or `size` query parameters | **200**; `size = 20` (the default), `page = 1`, `items.length = 20`, `total = 25` |
| F03-AC4 | 25 bookmarks are saved and the screen is showing page 2 at size 10 | The user changes the page-size selector to 20 | The next request is `GET /api/bookmarks?page=1&size=20` — **not** `page=2&size=20`; the screen renders page 1 of the new size |
| F03-AC5 | Any number of bookmarks are saved | `GET /api/bookmarks` is called with `size=500`, `size=7`, `size=abc`, `page=0`, `page=-1`, or `page=abc` | **200** in every case — never 400. An invalid `size` falls back to `20`; an invalid `page` falls back to `1`. The response always carries a valid `page`/`size` pair, never an error and never "return everything" |
| F03-AC6 | 25 bookmarks are saved, `size=10` (3 pages: 10, 10, 5) | `GET /api/bookmarks?page=99&size=10` is called | **200**; `page` in the response is `3` (the last valid page, computed as `ceil(25/10)`); `items` are the 5 bookmarks belonging to page 3 — not an empty array |
| F03-AC7 | Bookmarks spanning more than one page at `size=10` were saved | The application process is stopped and started again, then `GET /api/bookmarks?page=1&size=10` and `GET /api/bookmarks?page=2&size=10` are called | Both pages return the identical `items` (same `id`, `url`, `title`, `title_source`, `created_at` values and order) and the identical `total` as before the restart |
| F03-AC8 | A live bookmark has a title, a URL with a leading `www.`, an `added` timestamp from 2 days ago, and 2 tags | The list renders its card | The card shows: the title as a link; the hostname with a leading `www.` stripped in bold, followed by the path; the text `Added 2 days ago` (mockup `ago()` wording: `today` / `yesterday` / `N days ago` / `N weeks ago` / `N months ago`); each tag rendered as a chip carrying the tag's accessible name, with **no click handler and no filter action** (F04 adds that); and *Edit* and *Delete* buttons with `aria-label`s `Edit <title>` and `Delete <title>` present in the DOM (their behavior is verified in F06 and F07) |
| F03-AC9 | More than one page of bookmarks exists | The screen is navigated using only the keyboard | `Tab` reaches every card's *Edit* and *Delete* buttons and then the pagination control in visual order, each with a visible focus indicator; the page-size control is a native element with an associated `<label>`; the current page is conveyed as text (for example `Page 2 of 3`), not by position or colour alone |
| F03-AC10 | The list screen is loading for the first time, or the page or size has just changed | The request is in flight | The list region carries `aria-busy="true"` and a visible loading indicator; stale content is not silently left on screen indistinguishable from fresh content |
| F03-AC11 | `GET /api/bookmarks` fails (a network error or a non-2xx response) | The failure is received | The list area shows the plain-text message `Something went wrong loading your bookmarks.` in a live region, plus a *Retry* button; activating *Retry* re-issues the identical request (same `page` and `size`) |
| F03-AC12 | Exactly 1 bookmark is saved, and separately, exactly 2 are saved | The list renders | The count region reads `1 bookmark` (singular) for the first case and `2 bookmarks` (plural) for the second, matching `docs/mockup.html`'s wording rule |

### Requirement coverage

| Requirement | Covered by |
|---|---|
| R03 | F03-AC1, F03-AC7, F03-AC8, F03-AC12 |
| R08 | F03-AC7 |
| R11 | F03-AC2, F03-AC10, F03-AC11 |
| R15 | F03-AC3, F03-AC4, F03-AC5, F03-AC6, F03-AC9 |

## 3. Edge Cases

Inherited cases keep the `Found by` tag recorded in `specs/product-spec.md` §5. New cases raised while writing this spec are tagged `AI` and are prefixed `F03-EC`.

| EC ID | Scenario | Expected behavior | Found by |
|---|---|---|---|
| EC10 | No bookmarks saved yet | Empty state with an explanation and a primary action to add the first bookmark (F03-AC2) | assignment |
| EC19 | Application restarted mid-write | F01 owns the write transaction that prevents a partial row; F03's obligation is that the **list read** is correct afterward (F03-AC7). The mid-write fault-injection itself is an F01 `/test-phase` item | assignment |
| EC22 | Page size changed while a tag filter or search is active | **Partially covered here**: changing page size always returns to page 1 (F03-AC4). The "filter or search stays applied" half cannot be tested until F04/F05 exist, and is carried forward as a `/test-phase F04-filter-by-tag` and `/test-phase F05-search` item | assignment |
| EC23 | The last bookmark on the final page is deleted | F03 provides the page-clamp mechanism this depends on (F03-AC6). The delete-triggered re-fetch that exercises it in practice is F07's, once delete exists | assignment |
| EC24 | Page or page-size value supplied outside the allowed set, e.g. page 0, a negative page, or a page size of 500 | Falls back to a valid default instead of erroring or returning everything (F03-AC5) | assignment |
| F03-EC1 | Multiple bookmarks share the exact same `created_at` instant, and a page boundary falls among them | The `id DESC` tie-break (`ix_bookmark_list`) makes the split total and stable: no row appears on two pages, and none is skipped, across consecutive page requests | AI |
| F03-EC2 | `total` is an exact multiple of `size` (for example 20 bookmarks at `size=10`) | The last page is `2`, with no phantom, empty third page ever offered | AI |
| F03-EC3 | Exactly 1 bookmark vs. 2 or more | Count text is singular for 1, plural otherwise (F03-AC12) | AI |
| F03-EC4 | `GET /api/bookmarks` fails outright (network error, 5xx) | Plain-text error state with *Retry*, not a silent blank list (F03-AC11) | AI |
| F03-EC5 | A live bookmark carries zero tags | The card renders no tag-chip row at all — not an empty chip container occupying space | AI |

Ten edge cases recorded: 5 inherited (all tagged `assignment`, two of them only partially closed by this feature and explicitly handed to a later `/test-phase`), 5 new (`AI`).

## 4. Applicable NFRs

| NFR ID | How it applies to this feature |
|---|---|
| NFR-01 | F03 is this NFR's **primary owner**: a list page must render in < 1 s at 1,000 seeded bookmarks. The design relies on `ix_bookmark_list (deleted_at, created_at DESC, id DESC)` so the ordering, the soft-delete predicate and the `id DESC` tie-break (F03-EC1) are all satisfied by the index rather than a post-filter or a sort in application code. Measured, not estimated (Q6), in `/test-phase F03-list-bookmarks`. |
| NFR-02 | F03-AC7 is the read-side half of this NFR: the list returned after a stop/restart must match the list returned before it, page for page. |
| NFR-03 | F03-AC9 is the keyboard and label contract for the list and the new pagination control — visible focus throughout, a labelled page-size control, and the current page conveyed as text. This is the control RK04 flags as added UI surface that must not be missed in the keyboard walkthrough. |
| NFR-04 | F03-AC5 and F03-AC6 assert that `page` and `size` are always clamped server-side to safe values and bound as integers into `LIMIT`/`OFFSET` — never string-built from the request, and never an avenue to "return everything". This replaces F01's hardcoded `F01_LIST_LIMIT` constant with the real, request-driven contract. |

## 5. Out of Scope

Behaviors another feature owns, or deferred work. None of these may appear in F03's acceptance criteria.

- **Search by title or URL (R05), and its no-results state (EC11)** — F05.
- **Filtering by tag (R04), clickable/interactive tag chips, and the empty-tag-filter state (EC13)** — F04. F03 renders each bookmark's tags as static, non-interactive chips (§2, F03-AC8); F04 adds the click-to-filter behavior and the "narrow by tag" predicate to the shared query builder (AS-F03-01).
- **What happens when *Edit* or *Delete* is activated** — F06 and F07 respectively. F03 renders the buttons with correct accessible names but asserts nothing about their behavior.
- **The tag disappearing from a filter rail when its last bookmark is removed (EC17), and two-tab edit/delete conflicts (EC21)** — F04 and F06/F07.
- **Undo toast after a delete (R13)** — F07.
- **Theme toggle (R12, EC26)** — F08.
- **Tag autocomplete (R14, EC25)** — F02.
- **Remembering the chosen page size across a reload or restart** — not requested; each fresh load starts at page 1, size 20 (C-F03-02).
- **Deferred enhancements**, per `product-spec` §2: import/export, favicon display, bulk actions, browser-extension capture, full-text search of page contents.

## 6. Effort and Risks

- **Estimate:** **M**, matching `product-spec` §3. Ordering itself is a one-line `ORDER BY`; the cost is in the page/size clamp logic, the shared predicate-and-count builder F04 and F05 will extend (AS-F03-01), and the new pagination control's keyboard contract.

| Risk | Relevance to F03 | Handling |
|---|---|---|
| RK04 (added UI surface needs NFR-03 coverage) | The pagination control is new surface with no counterpart in `docs/mockup.html` | F03-AC9 puts it in the keyboard walkthrough explicitly, not left to be discovered later |
| RK05 (performance at 1,000 records unmeasured until persistence is exercised at volume) | F03 is where NFR-01 is actually measured | Seed 1,000 synthetic records (per `data-model.md` §6) and run the timed list-page check in `/test-phase F03-list-bookmarks`; record the observed median and maximum, never an estimate (Q6) |
| **New — F03-RK1** | F04 and F05 do not exist yet, so the shared predicate/count builder `AD-07` requires (one builder feeding both `COUNT` and the paged `SELECT`) is being shaped now with only two predicates wired in (`deleted_at IS NULL`, page/size). There is a risk its interface doesn't anticipate exactly what F04's tag predicate or F05's `LIKE` predicate need | Keep the builder to the minimal shape AD-07 already specifies — an ordered predicate-and-parameter list, nothing tag- or search-specific baked in. Document the exact function signature in `lld.md` so F04 and F05 extend it rather than each writing a second builder |

## 7. Assumptions and Clarifications

| Q-ID | Question | Answer (human) | Date |
|---|---|---|---|
| C-F03-01 | Does F03's card render each bookmark's tags, given F02 (tag entry) and F03 are siblings and neither depends on the other? | Yes — F03 renders each tag as a static, non-interactive chip (empty tag row if none exist yet). F04 adds the click-to-filter behavior on top of the same markup. | 2026-10-01 |
| C-F03-02 | What is the default page size, and is the user's choice remembered across a reload? | Default 20. Not persisted — every fresh load starts at page 1, size 20. | 2026-10-01 |
| C-F03-03 | Does the "Added … ago" wording follow `docs/mockup.html`'s relative-time function, or use an absolute date? | Adopt the mockup's wording verbatim (`today` / `yesterday` / `N days ago` / `N weeks ago` / `N months ago`), per U6. | 2026-10-01 |
| C-F03-04 | `docs/mockup.html` has no list-fetch-error state (its list never fails); what copy does F03 use? | New copy, not sourced from the reference: `Something went wrong loading your bookmarks.` with a *Retry* button that re-issues the identical request. | 2026-10-01 |

**AS-F03-01.** The shared predicate-and-count query builder `hld.md` AD-07 requires is built in this feature with only the `deleted_at IS NULL` predicate and the page/size clamp wired in; F04's tag predicate and F05's search predicate are added to the same builder rather than each writing a separate one. Reversible: if the builder's shape proves wrong for F04/F05, changing it is a `lld.md` revision inside this feature's own folder, not an architecture amendment — `hld.md` AD-07 only requires that one builder feed both queries, not a specific function signature.

## 8. Constitution Check

| Clause | Status | Note |
|---|---|---|
| P1 Specification before code | pass | This spec precedes any F03-specific LLD or code change. F01's existing `listRecent()` is an explicitly marked placeholder (`// F03 replaces this with the real paging contract`), not F03 code |
| P3 Honesty over polish | pass | No AC claims a verified result. F03-AC7 and the NFR-01 measurement state what `/test-phase` must observe |
| P4 Simplicity first | pass | One query builder shared by count and page (AD-07), no client-side pagination, no caching layer, no persisted page-size setting (C-F03-02) |
| P7 Measurable requirements | pass | 12 AC, every one Given/When/Then with an observable outcome: an HTTP status and JSON shape, an exact UI string, or a rendered DOM property |
| Q1 Every AC testable | pass | 8 of 10 edge cases map directly to an AC; the other two (EC19, EC22) are named as partially covered here with the remainder explicitly handed to a later feature's `/test-phase`, not silently dropped |
| S1 Validation at the boundary | pass | F03-AC5, F03-AC6 assert the **API's** clamped `page`/`size`, so a client-side-only clamp cannot satisfy them |
| S4 Parameterized queries | pass | F03-AC1–AC7 assert stored/returned state; `LIMIT`/`OFFSET` are bound integers per `data-model.md` §3, never string-built (F03-AC5) |
| A2/A5 Persistence | pass | F03-AC7 is a real stop/start check against the embedded SQLite file, reading through the same `ix_bookmark_list` index used before the restart |
| A4 Component map | pass | `api` and `web` both exist in `component-map.json` v1 |
| U1/U2 Keyboard and labels | pass | F03-AC9 covers focus order for cards and the new pagination control, a labelled page-size control, and the current page as text |
| U3 Empty/loading/error states | pass | F03-AC2 (empty), F03-AC10 (loading), F03-AC11 (error) are all named. The no-results and empty-tag-filter states are explicitly F05's and F04's, per §5 |
| U5 Actionable errors | pass | F03-AC11's message states what happened and offers *Retry* as the next step. No stack trace, SQL fragment or internal identifier reaches the client |
| **U6 Approved UX reference** | **addition, declared** | Two additions with no counterpart in `docs/mockup.html`, neither changing the reference's existing layout, states or copy: **(a)** the pagination control (page-size selector + page navigation), required by R15 and already recorded as a declared addition in `hld.md` §7; **(b)** the list-fetch-error state and its *Retry* button (C-F03-04), since the mockup's list never fails. Everything else — card layout, count wording (F03-AC12), the empty-state copy, and the relative-time wording (C-F03-03) — is ported verbatim |
| D1 Synthetic data | pass | Every example bookmark in this spec uses `example.com`; the NFR-01 seed script (`data-model.md` §6) is synthetic-only |
| E1 Evidence | pass | E-planning-301 records this session's material interaction |

## 9. Change Log

| Date | Change | Why | Source |
|---|---|---|---|
| 2026-10-01 | Initial feature specification, draft | `/plan-phase F03-list-bookmarks`, FEATURE-CREATE mode | planning |
| 2026-10-01 | Recorded C-F03-01…C-F03-04 (tag chips static for now, default page size 20 not persisted, mockup relative-time wording adopted, new error-state copy) and AS-F03-01 (shared predicate/count builder shaped now for F04/F05 to extend) | Four scope questions and one assumption raised while writing acceptance criteria, all accepted by dev-1 | planning |
| 2026-10-01 | Status set to approved; rolled up into `docs/01-planning.md` | Planning gate approved by dev-1 | planning |
