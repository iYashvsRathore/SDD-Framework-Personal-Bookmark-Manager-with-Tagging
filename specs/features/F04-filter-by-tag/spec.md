# F04: Filter by Tag (Spec)

**Feature ID:** F04-filter-by-tag
**Owner:** dev-1
**Status:** approved
**Approved:** 2026-10-01 by dev-1
**Requirements covered:** R04 (full), R11 (partial — the empty-tag-filter state, EC13; the loading and list-fetch-error states are already owned by F03)
**Components affected:** `api`, `web`
**Depends on:** F02, F03
**Constitution version:** 1.0.0

## 1. User Stories

- **F04-US1:** As Priya, I want to click a tag and see only the bookmarks carrying it, so that I can narrow a long list down to the topic I care about right now.
- **F04-US2:** As Priya, I want to see how many bookmarks each tag covers before I click it, so that I know which tag is worth narrowing to.
- **F04-US3:** As Priya, I want an obvious way to tell that a filter is active and to clear it, so that I am never confused about why some of my bookmarks are missing from the list.
- **F04-US4:** As Priya, I want a clear message when a tag has nothing in it, so that I know the filter worked rather than wondering if the app is broken.

## 2. Acceptance Criteria (testable)

| AC ID | Given | When | Then |
|---|---|---|---|
| F04-AC1 | Live bookmarks exist carrying the tags `research` (3), `design` (1) and `docs` (2) | The list screen loads | The tag rail (`nav#tags`, `aria-label="Filter by tag"`) renders an `All bookmarks` button first, showing the total live count, followed by one button per tag — alphabetically `design`, `docs`, `research` — each showing its live-bookmark count sourced from `GET /api/tags`; every button carries `aria-pressed="false"` |
| F04-AC2 | The rail is rendered as in F04-AC1, and a visible bookmark card carries the tag `research` as one of its tag chips | I activate the rail's `research` button, or separately activate the `research` chip on the card (`aria-label="Filter by tag research"`) | Either control issues `GET /api/bookmarks?tag=research&page=1&size=<current size>`; the rail's `research` button becomes `aria-pressed="true"`; an active-filter chip appears above the list reading `Tag: research` with a `Clear tag filter` control; the list re-renders to only bookmarks carrying `research` |
| F04-AC3 | Bookmarks exist: two carry `research`, one carries only `design` | `GET /api/bookmarks?tag=research` is called directly | **200**; `items` contains exactly the two bookmarks carrying `research` (each with its full `tags` array, not just the matched one); `total = 2`; the `design`-only bookmark is absent |
| F04-AC4 | The `research` filter is active (F04-AC2) | I activate the rail's `research` button a second time | The filter clears: the next request is `GET /api/bookmarks?page=1&size=<current size>` with **no** `tag` parameter; the button returns to `aria-pressed="false"`; the active-filter chip disappears; the list shows all live bookmarks again |
| F04-AC5 | The `research` filter is active | I activate the rail's `design` button | The next request carries `tag=design` only — never both tags; `research`'s button returns to `aria-pressed="false"` and `design`'s becomes `aria-pressed="true"` in the same update; the active-filter chip now reads `Tag: design` (AS-F04-01, single-select) |
| F04-AC6 | 25 bookmarks carry `research`; the list is showing page 3 at size 10 with `research` active | I either (a) activate a different tag, (b) activate `All bookmarks`, or (c) change the page-size selector to 20 | In all three cases the next request's `page` is `1`. In case (c) specifically, the request still carries `tag=research` — the filter is **not** dropped by a page-size change (EC22, second half, closed here) |
| F04-AC7 | A live bookmark carries the tag `research` | `GET /api/bookmarks?tag=Research` (different case) or `GET /api/bookmarks?tag=%20research%20` (padded with spaces) is called directly | **200**; the normalized value matches the stored lowercase, trimmed tag exactly as F02 stores it; the bookmark is included in `items`, identically to `tag=research` |
| F04-AC8 | No bookmark carries the tag `doesnotexist`, and separately the value `doesnotexist` has never been used as a tag name at all | `GET /api/bookmarks?tag=doesnotexist` is called directly | **200** (never 400 or 500); `{ items: [], total: 0, page: 1, size: <default> }` |
| F04-AC9 | The `design` filter is active and no live bookmark carries `design` (for example, the tag's last bookmark was just removed) | The list renders | The list area shows the empty state: heading `No bookmarks tagged "design"`, text `Remove the filter to see everything you have saved.`, and a primary `Clear tag filter` action that, when activated, clears the filter exactly as F04-AC4 (EC13) |
| F04-AC10 | A tag has live bookmarks, then every one of them is removed so the tag has zero live bookmarks | The rail next re-renders (for example after the list is reloaded) | The tag's button is absent from the rail entirely — `GET /api/tags` already excludes it (data-model.md §3's `HAVING COUNT(b.id) > 0`). If that tag was the active filter, the view falls back to `All bookmarks` (no `tag` parameter) rather than continuing to request a tag with zero results forever (EC17) |
| F04-AC11 | The list screen is loaded with more than one tag in the rail | I navigate using only the keyboard | `Tab` reaches `All bookmarks` and then every tag button in rail order, each with a visible focus indicator; `Enter` or `Space` activates the focused button exactly as a click would (toggle semantics of F04-AC4/AC5); each button's pressed state is conveyed through `aria-pressed`, not color alone; the active-filter chip's `Clear tag filter` control is reachable by `Tab` and keyboard-activatable |
| F04-AC12 | 10 bookmarks are live; a tag filter matching 3 of them is active, and separately no filter is active | The count region (`#count`, `aria-live="polite"`) renders | With the filter active: `3 of 10 bookmarks`. With no filter and no search: `10 bookmarks` (F03-AC12's wording, unchanged) |

### Requirement coverage

| Requirement | Covered by |
|---|---|
| R04 | F04-AC1, F04-AC2, F04-AC3, F04-AC4, F04-AC5, F04-AC6, F04-AC7, F04-AC10, F04-AC11, F04-AC12 |
| R11 | F04-AC9 |

## 3. Edge Cases

Inherited cases keep the `Found by` tag recorded in `specs/product-spec.md` §5. New cases raised while writing this spec are tagged `AI` and are prefixed `F04-EC`.

| EC ID | Scenario | Expected behavior | Found by |
|---|---|---|---|
| EC13 | Filter applied to a tag with no bookmarks | Empty state offering to clear the filter (F04-AC9) | assignment |
| EC17 | Deleting the last bookmark that carries a given tag | The tag disappears from the rail; an active filter on it falls back to `All bookmarks` rather than showing a dead filter (F04-AC10). The delete action itself is F07's; F04's obligation is the rail-and-fallback behavior once the tag has zero live bookmarks | AI |
| EC22 | Page size changed while a tag filter is active | The filter stays applied; the view returns to page 1 of the narrowed results (F04-AC6). The search-active half is F05's | AI |
| F04-EC1 | A tag value is supplied with different case or surrounding whitespace via a direct API call, bypassing the rail's own normalized button values | Normalized identically to how F02 stores tag names (trim, lowercase) before the equality match; the same bookmarks match regardless (F04-AC7) | AI |
| F04-EC2 | No bookmarks are saved at all | The rail renders only the `All bookmarks` button, with a count of 0, and no tag buttons — not an error and not an empty rail artifact. (The list's own empty state in this situation is F03's EC10, already owned there) | AI |
| F04-EC3 | A tag name containing a space, e.g. `front end` (allowed by `tag.name`'s character set, data-model.md INV-07) | Matches correctly as a single filter value — the space is part of the tag's identity, not a delimiter, and the equality match (not a `LIKE` pattern) is unaffected by it | AI |
| F04-EC4 | Two tag buttons are activated in rapid succession, so two list requests are in flight at once | The list reflects only the **most recently selected** tag's results; a slower, now-stale response for the previously selected tag is discarded rather than overwriting the current view | AI |

## 4. Applicable NFRs

| NFR ID | How it applies to this feature |
|---|---|
| NFR-01 | F04 is a **primary owner** of this NFR's "tag filter < 500 ms" half, at 1,000 seeded bookmarks. The design relies on `ix_bookmark_tag_lookup (tag_id, bookmark_id)` (data-model.md §3) so the tag predicate is an indexed join, not a scan. Measured, not estimated (Q6), in `/test-phase F04-filter-by-tag`. |
| NFR-03 | F04-AC11 is the keyboard and label contract for the new rail: visible focus, `Tab` order across `All bookmarks` and every tag button, `Enter`/`Space` to toggle, `aria-pressed` instead of color-only state, and a keyboard-reachable `Clear tag filter` control. |
| NFR-04 | F04-AC3, F04-AC7 and F04-AC8 assert that the tag filter is a **bound-parameter equality match** (data-model.md §3), never a pattern and never string-built from the request — an unrecognized or oddly-cased value returns zero rows, never a 400/500 (S1). |

## 5. Out of Scope

Behaviors another feature owns, or deferred work. None of these may appear in F04's acceptance criteria.

- **Filtering by more than one tag at once (AND or OR across tags)** — not requested by R04's wording ("select a tag", singular) or by `docs/mockup.html`'s single-`S.tag`-value toggle. See AS-F04-01.
- **Combining a tag filter with the search box, and that combination's own edge cases** — F05. F04 only establishes that the tag predicate and the page/size clamp interact correctly (F04-AC6); the search predicate is F05's to add to the same shared builder (AS-F03-01, `product-spec` §3).
- **Creating, renaming or deleting a tag, and the tag-entry chip input or its autocomplete** — F02.
- **The actual delete action that empties a tag's last bookmark (EC17's trigger), and undo** — F07. F04 owns only the rail's and the active filter's reaction once a tag has zero live bookmarks.
- **Edit behavior behind a card's *Edit* button, and the edit dialog's own tag input** — F06.
- **Theme toggle** — F08.
- **Persisting the active tag filter across a page reload or application restart** — not requested; consistent with F01's no-router decision and F03's C-F03-02 (page size also resets on reload). Every fresh load starts with no filter active.
- **Deferred enhancements**, per `product-spec` §2: import/export, favicon display, bulk actions, browser-extension capture, full-text search of page contents.

## 6. Effort and Risks

- **Estimate:** **S**, matching `product-spec` §3. The server-side slice is one predicate added to the existing shared builder (AS-F03-01) plus reuse of the already-built `GET /api/tags` endpoint; the client slice is a rail component, an active-filter chip, and the EC13 empty state — no new data model, no new index beyond the already-approved `ix_bookmark_tag_lookup`.

| Risk | Relevance to F04 | Handling |
|---|---|---|
| **New — F04-RK1** | The rail and the active-filter chip must stay in sync with two independent sources of truth: `GET /api/tags` (which tags exist and their counts) and `GET /api/bookmarks?tag=` (the filtered list). If a tag's count goes to zero between the two calls, the UI could show a filter with no visible reason it's empty, or keep requesting a tag the rail no longer lists (F04-EC4, EC17). | F04-AC9 and F04-AC10 assert the exact fallback behavior; F04-EC4 requires a stale-response guard (track the most recent request and discard any earlier one that resolves later) in the LLD. |
| RK05 (performance at 1,000 records unmeasured until exercised at volume) | F04 is a second primary owner of NFR-01, alongside F03's list-page measurement and F05's forthcoming search measurement. | Reuse the 1,000-row seed already established for F03 (`data-model.md` §6) and add a timed tag-filter run in `/test-phase F04-filter-by-tag`, recording the observed median and maximum (Q6). |

## 7. Assumptions and Clarifications

| Q-ID | Question | Answer (human) | Date |
|---|---|---|---|

**AS-F04-01.** The filter is single-select: choosing a tag replaces any previously active one, and R04 ("select a tag and see only the bookmarks associated with it") together with `docs/mockup.html`'s single `S.tag` value is read as one-tag-at-a-time narrowing, not a combinable multi-tag filter. Reversible: a multi-tag AND/OR filter would be a new requirement and a change to F04's acceptance criteria, not a reinterpretation of this one. Presented as a recommended default in the planning preview and accepted without correction.

**AS-F04-02.** The active tag filter is held only in client-side view state; it is not written to a URL, `localStorage`, or any persisted setting, and a fresh page load always starts with no filter active. This follows the same precedent F01 and F03 already set — there is no Angular Router in this application (F01's architecture decision), and F03's C-F03-02 already established that the page-size choice does not survive a reload either. Reversible: persisting it would be a `web`-only change to this feature's `lld.md`, not an architecture amendment. Presented as a recommended default in the planning preview and accepted without correction.

## 8. Constitution Check

| Clause | Status | Note |
|---|---|---|
| P1 Specification before code | pass | This spec precedes F04's LLD and any F04-specific code change. |
| P3 Honesty over polish | pass | No AC claims a verified result; each states what `/test-phase F04-filter-by-tag` must observe. |
| P4 Simplicity first | pass | One predicate added to the existing shared builder (AS-F03-01), no new table, no new index beyond the already-approved `ix_bookmark_tag_lookup`, single-select only (AS-F04-01), no persistence of the filter (AS-F04-02). |
| P7 Measurable requirements | pass | 12 AC, every one Given/When/Then with an observable outcome: an HTTP status and JSON shape, an exact UI string, or a rendered DOM/ARIA attribute. |
| Q1 Every AC testable | pass | All 7 edge cases in §3 map to at least one AC, or are explicitly named as partially covered pending a dependency feature (EC17's trigger needs F07; EC22's search half needs F05). |
| S1 Validation at the boundary | pass | F04-AC7 and F04-AC8 assert the **API's** normalization and its "never an error" behavior on an unrecognized tag value, independent of whatever the rail already filtered client-side. |
| S4 Parameterized queries | pass | The tag predicate is a bound-parameter equality match through the existing `bookmark_tag`/`tag` join (data-model.md §3), never a `LIKE` pattern and never string-built. |
| A4 Component map | pass | `api` and `web` both exist in `component-map.json` v1. |
| U1/U2 Keyboard and labels | pass | F04-AC11 covers focus order, visible focus, `Enter`/`Space` toggle semantics, and `aria-pressed` state for the rail; the `Clear tag filter` control is keyboard-reachable. |
| U3 Empty/loading/error states | pass | F04-AC9 covers the empty-tag-filter state (EC13); loading and list-fetch-error states are F03's and are not duplicated here. |
| U5 Actionable errors | pass | F04-AC9's empty state names the tag and offers the one clear next action; no AC exposes an internal identifier or raw exception text. |
| U6 Approved UX reference | pass | The rail (`nav#tags`, `aria-label="Filter by tag"`), its `aria-pressed` toggle semantics, the clickable per-card tag chip (`aria-label="Filter by tag <t>"`), the active-filter chip, the `"N of M bookmarks"` count wording, and the EC13 empty-state copy are all ported verbatim from `docs/mockup.html`'s `renderTags()`, `card()` and `empty('tag')` functions. No deviation is declared. |
| D1 Synthetic data | pass | Every tag and bookmark named in this spec is a generic word or an `example.com`-family address. |
| E1 Evidence | pass | E-planning-401 records this session's material interaction. |

## 9. Change Log

| Date | Change | Why | Source |
|---|---|---|---|
| 2026-10-01 | Initial feature specification, draft | `/plan-phase F04-filter-by-tag`, FEATURE-CREATE mode; dev-1 accepted both recommended defaults (AS-F04-01 single-select, AS-F04-02 no persistence) without correction | planning |
