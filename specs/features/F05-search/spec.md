# F05: Search (Spec)

**Feature ID:** F05-search
**Owner:** dev-1
**Status:** approved
**Approved:** 2026-10-01 by dev-1
**Requirements covered:** R05 (full), R11 (partial — the no-results state, EC11; loading and list-fetch-error states are already owned by F03, and the empty-tag-filter state by F04)
**Components affected:** `api`, `web`
**Depends on:** F03
**Constitution version:** 1.0.0

## 1. User Stories

- **F05-US1:** As Priya, I want to type a word and see only the bookmarks whose title or web address contains it, so that I can find a link quickly without scrolling through everything I have saved.
- **F05-US2:** As Priya, I want search to work together with an active tag filter, so that I can narrow by topic and then narrow further by what I remember about the title or address.
- **F05-US3:** As Priya, I want an easy way to clear my search, so that I can get back to my full list without retyping or reloading.
- **F05-US4:** As Priya, I want a clear message when nothing matches what I typed, so that I know the search worked rather than wondering if the app is broken.

## 2. Acceptance Criteria (testable)

| AC ID | Given | When | Then |
|---|---|---|---|
| F05-AC1 | Bookmarks titled `Weeknight tomato pasta` and `CSS grid guide` are live | `GET /api/bookmarks?q=tomato` is called | **200**; `items` contains exactly the pasta bookmark; `total = 1`; the other bookmark is absent |
| F05-AC2 | A live bookmark's title does not contain `docs`, but its URL does (`https://example.com/docs/intro?ref=docs`) | `GET /api/bookmarks?q=docs` is called | **200**; the bookmark is included — the match covers the title **or** the full URL (host, path, and query string), not the title alone |
| F05-AC3 | A live bookmark is titled `Weeknight Tomato Pasta` | `GET /api/bookmarks?q=TOMATO` and separately `GET /api/bookmarks?q=tomato` are called | Both return the identical `items` and `total` — the match is case-insensitive |
| F05-AC4 | Two live bookmarks are titled `100% done` and `100X done` | `GET /api/bookmarks?q=100%25` (URL-encoded literal `%`) is called | **200**; `items` contains only `100% done` — the `%` in the search text is treated as a literal character, never as a SQL wildcard (EC12, S6) |
| F05-AC5 | Two live bookmarks are titled `under_score test` and `underXscore test` | `GET /api/bookmarks?q=under_score` is called | **200**; `items` contains only the bookmark with the literal underscore — the `_` single-character wildcard is escaped, so it does not also match `underXscore` (EC12, S6) |
| F05-AC6 | A live bookmark's title contains a quote mark (`O'Reilly guide`), and separately none contain the text `<script>` | `GET /api/bookmarks?q=<script>alert(1)</script>` and `GET /api/bookmarks?q=O'Reilly` are called directly | **200** in both cases, never an error; the search text is treated as literal characters in a bound parameter — nothing executes, no quote breaks the query, and a match is returned only when a title or URL literally contains the substring (EC12, S6) |
| F05-AC7 | At least one bookmark is live, and none of their titles or URLs contain `zzzqqq` | `GET /api/bookmarks?q=zzzqqq` is called and the list screen renders the response | **200**; `items: []`, `total: 0`; the screen shows the no-results state: heading `No bookmarks match "zzzqqq"`, text `Check the spelling or try fewer words. Search looks at titles and web addresses.`, and a primary `Clear search` action that reissues the identical request with no `q` parameter (EC11, `docs/mockup.html` wording verbatim) |
| F05-AC8 | No bookmarks are saved at all (`total = 0` with no filter applied) | The user types any search text | The screen shows F03's `No bookmarks yet` empty state, **not** F05's no-results state — the zero-bookmarks-at-all case always takes precedence over a typed query, matching `docs/mockup.html`'s `!n ? 'none' : q ? 'search' : 'tag'` precedence rule |
| F05-AC9 | Live bookmarks carry the tag `research`; some of those also have `guide` in their title, some do not; other bookmarks match `guide` but do not carry `research` | `GET /api/bookmarks?tag=research&q=guide` is called | **200**; `items` is exactly the **intersection** — bookmarks that both carry `research` and match `guide` (AND semantics, AS-F05-01); a bookmark matching only one of the two conditions is absent |
| F05-AC10 | 25 bookmarks match `q=guide`, and the screen is showing page 2 at size 10 | (a) The search text changes, or (b) the page-size selector changes to 20 while `q=guide` is still active | In both cases the next request's `page` is `1`. In case (b) specifically, the request still carries `q=guide` — the search is **not** dropped by a page-size change (EC22, closed here for the search half; F04 already closed the tag-filter half) |
| F05-AC11 | No UI is involved | `GET /api/bookmarks?q=` is called directly with a 210-character value | **200**, never 400; the search text is capped at 200 characters server-side before matching (matching the tag/size/page boundary pattern already established for other query parameters) |
| F05-AC12 | The list screen is loaded | I operate the search box using only the keyboard | `Tab` reaches the search input (`#q`) with a visible focus indicator and its associated visually-hidden `<label>` reading `Search bookmarks by title or web address`; typing is debounced (250 ms) before a request is issued; the `Clear search` control (`#qx`, `aria-label="Clear search"`) appears only once text is present, is reachable by `Tab`, and is keyboard-activatable |
| F05-AC13 | Two keystrokes are typed in rapid succession, so two `GET /api/bookmarks?q=` requests are in flight at once | The slower request (matching the earlier, now-stale keystroke) resolves after the faster one | The list reflects only the response for the **most recently typed** search text; the stale response is discarded rather than overwriting the current view (same guard shape as F04-EC4) |

### Requirement coverage

| Requirement | Covered by |
|---|---|
| R05 | F05-AC1, F05-AC2, F05-AC3, F05-AC4, F05-AC5, F05-AC6, F05-AC9, F05-AC10, F05-AC11, F05-AC12, F05-AC13 |
| R11 | F05-AC7, F05-AC8 |

## 3. Edge Cases

Inherited cases keep the `Found by` tag recorded in `specs/product-spec.md` §5. New cases raised while writing this spec are tagged `AI` and are prefixed `F05-EC`.

| EC ID | Scenario | Expected behavior | Found by |
|---|---|---|---|
| EC11 | Search returns no results | No-results state naming the search text and offering to clear it (F05-AC7) | assignment |
| EC12 | Search text contains `%`, `_`, quotes or `<script>` | Treated as literal text, not as a pattern or markup. Results are correct and nothing executes (F05-AC4, F05-AC5, F05-AC6) | assignment |
| EC22 | Page size changed while a tag filter or search is active | **Search half closed here**: the search stays applied and the view returns to page 1 (F05-AC10). The tag-filter half was already closed by F04 | assignment |
| F05-EC1 | Two keystrokes in rapid succession put two list requests in flight at once | The list reflects only the most recently typed search text; a slower, now-stale response for an earlier keystroke is discarded (F05-AC13) | AI |
| F05-EC2 | A `q` value longer than 200 characters is supplied via a direct API call, bypassing the client's own input handling | Capped server-side to 200 characters before matching; never a 400 (F05-AC11) | AI |
| F05-EC3 | Search text is combined with an active tag filter | Both predicates apply together (AND); only bookmarks satisfying both are returned (F05-AC9) | AI |
| F05-EC4 | A match exists only in the URL (host, path, or query string), not in the title | Still returned — the match covers the full URL, not the title alone (F05-AC2) | AI |
| F05-EC5 | The store has zero live bookmarks in total, and the user types a search query anyway | F03's "no bookmarks yet" empty state renders, not F05's no-results state (F05-AC8) | AI |
| F05-EC6 | Search is cleared while a tag filter is active, or a tag filter is cleared while search text is present | Only the cleared predicate is removed from the request; the other stays applied — clearing one control never clears the other | AI |

Nine edge cases recorded: 3 inherited (2 tagged `assignment` fully closed here, 1 tagged `assignment` with its search half closed here), 6 new (`AI`).

## 4. Applicable NFRs

| NFR ID | How it applies to this feature |
|---|---|
| NFR-01 | F05 is this NFR's **other primary owner**, alongside F04: search must return in < 500 ms at 1,000 seeded bookmarks. Per `hld.md` AD-06, the leading-wildcard `LIKE` cannot use an index and is an accepted scan cost at this volume — measured, not estimated (Q6, RK05), in `/test-phase F05-search`. |
| NFR-03 | F05-AC12 is the keyboard and label contract for the search box and its `Clear search` control: visible focus, an associated label, and a keyboard-reachable clear action. |
| NFR-04 | F05-AC4, F05-AC5 and F05-AC6 assert that the search predicate is a **bound parameter** with `%` and `_` escaped and the statement carrying `ESCAPE '\'` (data-model.md §3) — never string-built from the request (S4, S6). F05-AC11 asserts the 200-character cap is enforced server-side, not only in the client. |

## 5. Out of Scope

Behaviors another feature owns, or deferred work. None of these may appear in F05's acceptance criteria.

- **Search by tag name** — not requested; R05 covers title and URL only, confirmed by AS05/C08 in `product-spec.md` §6–7. Narrowing by tag name is R04's job (F04).
- **Full-text search of page contents** — not in the source; listed as a deferred enhancement in `product-spec` §2.
- **Persisting the typed search text across a reload or application restart** — not requested; consistent with F03's C-F03-02 and F04's AS-F04-02, neither of which persist their own view state either (AS-F05-02).
- **Combining search with more than one simultaneously active tag** — out of scope because F04's AS-F04-01 already establishes the tag filter is single-select; F05 only asserts that search composes with whichever single tag (if any) is active (F05-AC9).
- **The tag rail, its click-to-filter behavior, and the empty-tag-filter state** — F04.
- **Creating, normalizing, or suggesting tags** — F02.
- **The page/size clamp mechanics themselves (the `{10,20,50}` allow-list, the last-valid-page fallback)** — F03; F05 only asserts that its own `q` predicate composes correctly with that existing mechanism (F05-AC10).
- **Loading and list-fetch-error states** — F03; not duplicated here.
- **What happens when *Edit* or *Delete* is activated on a bookmark that happens to be in the search results** — F06 and F07 respectively.
- **Deferred enhancements**, per `product-spec` §2: import/export, favicon display, bulk actions, browser-extension capture.

## 6. Effort and Risks

- **Estimate:** **S**, matching `product-spec` §3. The server-side slice is one predicate added to the existing shared builder (AS-F03-01) plus the `%`/`_` escaping already specified in `data-model.md` §3; the client slice is the search box, the debounce, the `Clear search` control, and the EC11 no-results state — no new table, no new index, no schema change.

| Risk | Relevance to F05 | Handling |
|---|---|---|
| RK05 (performance at 1,000 records unmeasured until exercised at volume) | F05 is the other primary owner of NFR-01's search half, alongside F04's tag-filter half and F03's list-page measurement. | Reuse the 1,000-row seed already established for F03 (`data-model.md` §6) and add a timed search run in `/test-phase F05-search`, recording the observed median and maximum (Q6). |
| **New — F05-RK1** | The stale-response race (F05-EC1) requires the same "track the most recent request and discard a slower, earlier one that resolves later" guard that F04-RK1 already requires for the tag rail. If each feature's LLD writes its own copy, the two guards can drift (F04-AC... one fixed, the other missed). | Document in F05's `lld.md` whether the guard is a single reusable piece shared with F04's implementation, or an intentionally separate one — either way, state the decision explicitly rather than leaving two near-identical implementations undocumented. |

## 7. Assumptions and Clarifications

| Q-ID | Question | Answer (human) | Date |
|---|---|---|---|
| C-F05-01 | When both a tag filter and search text are active, do they combine with AND (both must match) or OR (either matches)? | Accepted the recommended default: AND — matches `docs/mockup.html`'s `render()` (`(!S.tag||b.tags.includes(S.tag)) && (!q||...)`) and is the only reading consistent with F04's single-select filter design (AS-F05-01). | 2026-10-01 |
| C-F05-02 | Is the typed search text remembered across a reload? | Accepted the recommended default: no — consistent with F03's C-F03-02 and F04's AS-F04-02 (AS-F05-02). | 2026-10-01 |

**AS-F05-01.** Search and an active tag filter combine with AND, not OR: a bookmark must satisfy both to appear in the results. This is the only reading consistent with `docs/mockup.html`'s reference implementation and with F04's single-select tag design. Reversible: an OR combination would be a change to F05's acceptance criteria only, not an architecture amendment. Presented as a recommended default in the planning preview and accepted without correction.

**AS-F05-02.** The typed search text is held only in client-side view state; it is not written to a URL, `localStorage`, or any persisted setting, and a fresh page load always starts with no search active. This follows the same precedent F03 (C-F03-02) and F04 (AS-F04-02) already set. Reversible: persisting it would be a `web`-only change to this feature's `lld.md`, not an architecture amendment. Presented as a recommended default in the planning preview and accepted without correction.

## 8. Constitution Check

| Clause | Status | Note |
|---|---|---|
| P1 Specification before code | pass | This spec precedes F05's LLD and any F05-specific code change. |
| P3 Honesty over polish | pass | No AC claims a verified result; each states what `/test-phase F05-search` must observe. |
| P4 Simplicity first | pass | One predicate added to the existing shared builder (AS-F03-01), no new table, no new index, AND-only combination with the tag filter (AS-F05-01), no persistence of the search text (AS-F05-02). |
| P7 Measurable requirements | pass | 13 AC, every one Given/When/Then with an observable outcome: an HTTP status and JSON shape, an exact UI string, or a rendered DOM/ARIA attribute. |
| Q1 Every AC testable | pass | All 9 edge cases in §3 map to at least one AC, or (EC22) are explicitly named as the half closed here, with the other half already closed by F04. |
| S1 Validation at the boundary | pass | F05-AC11 asserts the **API's** 200-character cap, independent of whatever the client already trims. |
| S4 Parameterized queries | pass | F05-AC4, F05-AC5 and F05-AC6 assert the search predicate is a bound parameter, never string-built from the request. |
| S6 LIKE escaping | pass | F05-AC4 and F05-AC5 specifically assert `%` and `_` are treated as literal characters, matching `data-model.md` §3's `ESCAPE '\'` design. |
| A4 Component map | pass | `api` and `web` both exist in `component-map.json` v1. |
| U1/U2 Keyboard and labels | pass | F05-AC12 covers focus, the associated label, and the keyboard-reachable `Clear search` control. |
| U3 Empty/loading/error states | pass | F05-AC7 covers the no-results state (EC11); F05-AC8 explicitly defers to F03's all-empty state rather than duplicating it; loading and list-fetch-error states are F03's and are not repeated here. |
| U5 Actionable errors | pass | F05-AC7's no-results message names the search text and offers the one clear next action; no AC exposes an internal identifier or raw exception text. |
| U6 Approved UX reference | pass | The search box (`#q`, visually-hidden label), the `Clear search` control (`#qx`), the no-results copy, and the `!n ? 'none' : q ? 'search' : 'tag'` empty-state precedence are all ported verbatim from `docs/mockup.html`'s `render()` and `empty()` functions. No deviation is declared. |
| D1 Synthetic data | pass | Every example bookmark and search term in this spec uses generic words or an `example.com`-family address. |
| E1 Evidence | pass | E-planning-501 records this session's material interaction. |

## 9. Change Log

| Date | Change | Why | Source |
|---|---|---|---|
| 2026-10-01 | Initial feature specification, draft | `/plan-phase F05-search`, FEATURE-CREATE mode; dev-1 accepted both recommended defaults (AS-F05-01 AND combination with tag filter, AS-F05-02 no persistence) without correction | planning |
| 2026-10-01 | Status set to approved; rolled up into `docs/01-planning.md` | Planning gate approved by dev-1 | planning |
