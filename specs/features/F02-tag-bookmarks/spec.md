# F02: Tag Bookmarks (Spec)

**Feature ID:** F02-tag-bookmarks
**Owner:** dev-1
**Status:** approved
**Approved:** 2026-10-01 by dev-1
**Requirements covered:** R02 (full), R09 (partial — tag-field validation, as distinct from F01's URL validation), R14 (full)
**Components affected:** `api`, `web`
**Depends on:** F01
**Constitution version:** 1.0.0

## 1. User Stories

- **F02-US1:** As Priya, I want to attach one or more tags to a bookmark when I save it, so that I can find it later by topic rather than only by title or web address.
- **F02-US2:** As Priya, I want existing tags suggested to me as I type, so that I reuse a tag I already have instead of creating near-duplicates.
- **F02-US3:** As Priya, I want to be stopped from adding a tag that is too long, too numerous, or made of odd characters, so that my tag list stays clean and useful.
- **F02-US4:** As Priya, I want two spellings of the same tag that differ only by case to count as one tag, so that my bookmarks are not split across "Research" and "research".

## 2. Acceptance Criteria (testable)

| AC ID | Given | When | Then |
|---|---|---|---|
| F02-AC1 | The add dialog is open with a valid *Web address* entered | I add the tags `Research` and `docs` via the tag input (Enter after each) and activate *Save bookmark* | `POST /api/bookmarks` returns **201**; the response's `bookmark.tags` contains exactly `["docs","research"]` (lowercased, alphabetical); a `tag` row with `name='research'` and a `tag` row with `name='docs'` exist, each linked to the new bookmark through `bookmark_tag` |
| F02-AC2 | The tag input already has a chip `research` | I type `Research` and press Enter | No second chip appears — the chip list still shows exactly one `research` entry (mirrors `docs/mockup.html`'s `chips.includes(v)` guard). On save, the bookmark's `tags` array is exactly `["research"]` and exactly one `bookmark_tag` row exists for it (EC14) |
| F02-AC3 | The tag input is empty or focused | I type only spaces and press Enter or comma | No chip is added; the chip list is unchanged; no error message appears (mirrors `docs/mockup.html`'s no-op on an empty trimmed value) (EC15) |
| F02-AC4 | The tag input is empty | I type `urgent,docs,offline` (the commas trigger as I type, matching `docs/mockup.html`'s `input` handler) | Three chips appear — `urgent`, `docs`, `offline` — each created through the same normalize/dedupe/cap rules as pressing Enter individually, and the input clears |
| F02-AC5 | 8 tag chips are already present | I type a 9th tag and press Enter | No 9th chip appears; the input clears as it would for a successful add; no error message is shown (mirrors `docs/mockup.html`'s `chips.length<8` guard) |
| F02-AC6 | No UI is involved | `POST /api/bookmarks` is called directly with a valid URL and 9 distinct valid tag strings (bypassing the client's 8-tag cap) | **400** with `error.code='INVALID_TAG'`, `error.field='tags'`, message `You can add up to 8 tags.`; **no bookmark row is written at all** — not even with the first 8 tags kept |
| F02-AC7 | The tag input is empty | I type a 30-character tag and press Enter | The chip shown holds the **first 24 characters** of what I typed, lowercased (mirrors `docs/mockup.html`'s `.slice(0,24)`); no error message appears |
| F02-AC8 | No UI is involved | `POST /api/bookmarks` is called directly with a valid URL and one tag of exactly 25 characters | **400** `INVALID_TAG`, `field='tags'`, message `Tags can be up to 24 characters.`; no row written. The identical call with a 24-character tag instead returns **201** and stores it unchanged |
| F02-AC9 | No UI is involved | `POST /api/bookmarks` is called directly with a valid URL and a tag containing a disallowed character, e.g. `re$earch` or `tag!` | **400** `INVALID_TAG`, `field='tags'`, message `Tags can only contain letters, numbers, spaces, hyphens and underscores.`; no row written. The identical call with `front-end dev_2` instead returns **201** |
| F02-AC10 | The add dialog is open | I operate the tag input using only the keyboard | `Tab` reaches the tag input in visual order with a visible focus indicator; `Enter` or `,` commits the current text as a chip; `Backspace` on an empty tag input removes the most recently added chip and keeps focus in the input; every chip's remove control has `aria-label="Remove tag <name>"`; the tag input has an associated `<label for>` reading `Tags` |
| F02-AC11 | Bookmarks exist carrying the tags `docs`, `design` and `database`, and no other tag starts with `d` | `GET /api/tags?prefix=d` is called, and separately `GET /api/tags?prefix=DOC` | Both return **200** with body `["database","design","docs"]` for the first call and `["docs"]` for the second — alphabetically ordered, matching case-insensitively against the stored lowercase names |
| F02-AC12 | No bookmarks have been saved yet (no `tag` rows exist) | The add dialog's tag field receives focus, triggering `GET /api/tags?prefix=` | **200** with an empty array `[]`; the suggestion list/datalist shows no options and no error appears (EC25) |
| F02-AC13 | More than 10 distinct tags share the prefix `s` | `GET /api/tags?prefix=s` is called; separately, a suggestion is chosen from the resulting datalist | The response contains **exactly 10** names, the first 10 alphabetically. Choosing a suggestion adds it as a chip through the same path as typing it — normalized, deduped against existing chips, and subject to the same 8-tag/24-character/character-allow-list rules |

### Requirement coverage

| Requirement | Covered by |
|---|---|
| R02 | F02-AC1, F02-AC2, F02-AC3, F02-AC4, F02-AC5, F02-AC7, F02-AC10 |
| R09 | F02-AC6, F02-AC8, F02-AC9 |
| R14 | F02-AC11, F02-AC12, F02-AC13 |

## 3. Edge Cases

Inherited cases keep the `Found by` tag recorded in `specs/product-spec.md` §5. New cases raised while writing this spec are tagged `AI` and are prefixed `F02-EC`.

| EC ID | Scenario | Expected behavior | Found by |
|---|---|---|---|
| EC14 | Duplicate tags on one bookmark differing only by case, e.g. `Research` and `research` | Merged into one tag; the bookmark shows it once (F02-AC2) | assignment |
| EC15 | Empty or whitespace-only tag entered | Not added; no empty chip appears (F02-AC3) | assignment |
| EC25 | Tag autocomplete when no tags exist yet | The suggestion list is simply empty; no error, no empty dropdown artifact (F02-AC12) | AI |
| F02-EC1 | A comma-separated or pasted list of tags is entered in one action | Each segment becomes its own chip through the same normalize/dedupe/cap rules as typing one tag at a time (F02-AC4) | AI |
| F02-EC2 | The 8-tag limit, the 24-character limit, or the character allow-list is bypassed by calling the API directly rather than through the chip input | The **whole** request is rejected with `INVALID_TAG` and no row is written at all — the server never trusts that the client has already enforced these limits (F02-AC6, F02-AC8, F02-AC9) | AI |
| F02-EC3 | A tag is exactly at the 24-character boundary, and separately one character over it | 24 characters is accepted and stored unchanged; 25 is rejected at the API (F02-AC8) | AI |
| F02-EC4 | Autocomplete `prefix` is supplied in a different case than the stored (always-lowercase) tag names | The match is case-insensitive; the same set of names is returned regardless of the prefix's case (F02-AC11) | AI |
| F02-EC5 | More than 10 stored tags share the same prefix | The suggestion list is capped at 10 results, alphabetically, rather than overwhelming the UI (F02-AC13) | AI |

## 4. Applicable NFRs

| NFR ID | How it applies to this feature |
|---|---|
| NFR-03 | F02-AC10 is the keyboard and label contract for the tag chip input: visible focus, `Tab` order, `Enter`/`,` to commit, `Backspace` to remove the last chip, an accessible `aria-label` on every chip's remove control, and a `<label for>` on the input itself. |
| NFR-04 | Tags are stored and compared as bound parameters (S4, data-model §3). The character allow-list (F02-AC9) and the length/count caps (F02-AC6, F02-AC8) are enforced **server-side** regardless of what the client already filtered (S1) — the API is reachable directly with `curl`. Tag text is escaped on output, including inside a chip's `aria-label` (S3), so a tag cannot be used to inject markup. |

## 5. Out of Scope

Behaviors another feature owns, or deferred work. None of these may appear in F02's acceptance criteria.

- **Displaying tags as read-only chips on a bookmark's list card** — F03, already shipped (F03-AC8): "no click handler and no filter action."
- **Clicking a tag to filter the list by it, and the tag-filter rail's own empty state (EC13)** — F04.
- **The tag input on the *edit* dialog**, including pre-filling it with the bookmark's existing tags and re-validating on save — F06. F02 builds the chip-input behavior and the `api` tag-normalization and autocomplete services that F06 reuses; F02 does not itself wire them into the edit form, matching F01's precedent of deferring another field to its owning feature (F01 §5, C-F01-05).
- **A tag-management screen** for renaming or merging a tag name across every bookmark that carries it — not requested by the source (AS04, `product-spec` §6).
- **Ranking autocomplete suggestions by usage frequency or recency** — not requested; F02-AC11/AC13 use alphabetical order only.
- **Deferred enhancements**, per `product-spec` §2: import/export, favicon display, bulk actions, browser-extension capture, full-text search of page contents.

## 6. Effort and Risks

- **Estimate:** **M**, matching `product-spec` §3. The chip-input interaction itself is small, but it must exactly reproduce `docs/mockup.html`'s client-side rules (silent truncation, silent cap, comma-splitting, dedupe) while the API independently enforces the same limits strictly, plus the `GET /api/tags?prefix=` autocomplete query.

| Risk | Relevance to F02 | Handling |
|---|---|---|
| **New — F02-RK1** | The client is deliberately lenient (it truncates, caps and dedupes silently, per `docs/mockup.html`) while the API is deliberately strict (it rejects the whole request on the same conditions, per C-F02-01). If the service layer is ever skipped or weakened, the two no longer agree and S1 ("validation at the boundary") is violated without any UI symptom. | F02-AC6, F02-AC8 and F02-AC9 assert the API's behavior independently of the client, by calling the endpoint directly — these are the tests that would catch a regression here. |
| RK01 (scope vs the 2026-10-05 date) | F02 depends on F01 and blocks F04; keeping it to the single chip-input component (§5) avoids scope creep into a tag-management screen. | Unchanged from `product-spec` §6. |

## 7. Assumptions and Clarifications

| Q-ID | Question | Answer (human) | Date |
|---|---|---|---|
| C-F02-01 | If the 8-tag cap, the 24-character limit, or the character allow-list is bypassed by calling the API directly, should the whole save be rejected, or should the server silently drop/truncate the offending tags and save anyway? | Reject the whole request (`INVALID_TAG`, no row written) — consistent with F01's all-or-nothing URL validation and with S1. | 2026-10-01 |
| C-F02-02 | `hld.md`'s error table names wording for the length and count limits but not for a disallowed character, and the mockup's client code never rejects on characters at all. What is the message? | `Tags can only contain letters, numbers, spaces, hyphens and underscores.`, same `INVALID_TAG` code, `field: 'tags'`. | 2026-10-01 |
| C-F02-03 | How many suggestions does `GET /api/tags?prefix=` return at most? | Top 10, alphabetical. | 2026-10-01 |
| C-F02-04 | Does F02 ship the tag chip input on the add dialog only, or does its scope also include wiring it into the edit dialog? | Add dialog only; F06 wires the same component/service into the edit dialog. | 2026-10-01 |
| C-F02-05 | R02 says "one or more" but the data model allows 0..8 tags per bookmark. Are zero tags allowed on save? | Yes — tags are optional; R02 only constrains what happens if tags are supplied. | 2026-10-01 |

**AS-F02-01.** The order of tag names in an API response (`bookmark.tags`, and `GET /api/tags?prefix=`) is alphabetical. The source and the HLD do not specify an order; alphabetical is chosen for determinism and is what F02-AC1, F02-AC11 and F02-AC13 assert. Reversible: a different order would only change these ACs' exact-array assertions, not the underlying data.

## 8. Constitution Check

| Clause | Status | Note |
|---|---|---|
| P1 Specification before code | pass | This spec precedes F02's LLD and any F02 code. |
| P3 Honesty over polish | pass | No AC claims a verified result; each states what `/test-phase` must observe. |
| P4 Simplicity first | pass | One reusable chip-input component and two small service-layer rules (normalize/cap, prefix query); no tag-management screen, no ranking logic. |
| P7 Measurable requirements | pass | 13 AC, every one Given/When/Then with an observable outcome: an HTTP status and error code, an exact UI/array value, or a stored row count. |
| Q1 Every AC testable | pass | All 8 edge cases in §3 map to at least one AC; none are left as untestable assertions. |
| S1 Validation at the boundary | pass | F02-AC6, F02-AC8, F02-AC9 assert the **API's** rejection directly, independent of whatever the client already filtered. |
| S3 Output escaping | pass | Tag text, including inside a chip's `aria-label`, is escaped on output per `hld.md` §8's security table; no AC relies on `[innerHTML]`. |
| S4 Parameterized queries | pass | Tag inserts and the `bookmark_tag` link rows use bound-parameter prepared statements per `data-model.md` §3. |
| A4 Component map | pass | `api` and `web` both exist in `component-map.json` v1. |
| U1/U2 Keyboard and labels | pass | F02-AC10 covers focus order, visible focus, keyboard commit/remove, and `<label for>` on the tag input. |
| U3 Empty/loading/error states | pass | F02-AC12 covers the "no tags yet" autocomplete state; the chip input has no separate loading state because the suggestion query is a native, synchronous-feeling `<datalist>` lookup with no spinner in `docs/mockup.html`. |
| U5 Actionable errors | pass | Every `INVALID_TAG` message in §2 says what the limit is; no message exposes an internal identifier or raw exception text. |
| U6 Approved UX reference | pass | The chip input, its `Enter`/comma commit, its silent truncation and cap, and the `<datalist>` suggestions are ported directly from `docs/mockup.html`'s `#tg`/`#ci`/`#tl` and `addTag()` function; no deviation is claimed. |
| D1 Synthetic data | pass | Every tag and URL named in this spec is a generic word or an `example.com`-family address. |
| E1 Evidence | pass | E-planning-201 records this session's material interaction. |

## 9. Change Log

| Date | Change | Why | Source |
|---|---|---|---|
| 2026-10-01 | Initial feature specification, approved same day | `/plan-phase F02-tag-bookmarks`, FEATURE-CREATE mode; dev-1 accepted the recommended default for all five clarifying questions (C-F02-01…C-F02-05) in the same round; planning gate approved by dev-1 | planning |
| 2026-10-01 | F02-AC11's second example changed from `GET /api/tags?prefix=DA` → `["database","design"]` to `GET /api/tags?prefix=DOC` → `["docs"]` | The original example was mathematically inconsistent with this spec's own plain-prefix-match contract and with `lld.md`'s documented algorithm: "design" does not start with "da", so no correct implementation could satisfy it. First surfaced at the Build gate (F02-T05, E-build-201) as a flagged, unfixed discrepancy; corrected here as F02-RV04 at the Review gate and approved by dev-1 the same day | review |
