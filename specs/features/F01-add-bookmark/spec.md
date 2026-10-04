# F01: Add Bookmark (Spec)

**Feature ID:** F01-add-bookmark
**Owner:** dev-1
**Status:** approved
**Approved:** 2026-10-01 by dev-1; **re-approved 2026-10-01** by dev-1 after the C-F01-08 / C-F01-09 revision (§9). dev-1's words: *"once it is drafted then mark it approved as this is already approved and we are making a change in docs which is already implemented in code"*
**Requirements covered:** R01 (full), R09 (full — URL field), R10 (full — create path), R08 (partial — a created bookmark survives restart), R11 (partial — invalid-input, duplicate and title-fetch-failure states)
**Components affected:** `api`, `web`
**Depends on:** — (none; F01 is the root of the dependency graph)
**Constitution version:** 1.0.0

> **AMD-001 cleared 2026-10-01; note retired.** This paragraph originally blocked `/design-feature F01-add-bookmark` on AMD-001 (C-F01-02, C-F01-03) being approved and applied first. AMD-001 was approved and applied the same day, `lld.md` was written and gate-approved against the resulting `hld.md`/`data-model.md` v2, and a further amendment (AMD-002) and a `lld.md` CHANGE-mode revision have both landed since. Left here, unedited, only the record would be false; nothing downstream still depends on it.

## 1. User Stories

- **F01-US1:** As Priya, I want to save a web address from the main screen in one step, so that keeping a link costs me less effort than leaving the tab open.
- **F01-US2:** As Priya, I want a useful title filled in for me when I do not type one, so that my list is readable without extra typing.
- **F01-US3:** As Priya, I want to be told in plain words when an address cannot be saved and what to do about it, so that I am not left guessing why nothing happened.
- **F01-US4:** As Priya, I want to be stopped from saving the same link twice, so that my list does not fill up with duplicates I have to clean out later.
- **F01-US5:** As Priya, I want the bookmarks I saved to still be there after I stop and restart the application, so that I can trust it with links I care about.

## 2. Acceptance Criteria (testable)

| AC ID | Given | When | Then |
|---|---|---|---|
| F01-AC1 | The application is running and the add dialog is open | I enter `https://example.com/article` in *Web address*, enter `My article` in *Title*, and activate *Save bookmark* | `POST /api/bookmarks` returns **201**; a `bookmark` row exists with `url = 'https://example.com/article'`, `title = 'My article'`, `title_source = 'user'`, `created_at` and `updated_at` set to the same ISO-8601 UTC instant, and `deleted_at IS NULL` |
| F01-AC2 | A user title was supplied (F01-AC1) | The save completes | **No outbound HTTP request is made to the bookmarked host.** The fetcher is not called at all |
| F01-AC3 | The save in F01-AC1 succeeded | The response is received | The dialog closes and a toast reading `Bookmark saved` appears in the `aria-live="polite"` toast region |
| F01-AC4 | The *Title* field is left empty and the target page returns HTML whose `<title>` is `Weeknight tomato pasta` | I activate *Save bookmark* | **201**; the stored row has `title = 'Weeknight tomato pasta'` and `title_source = 'fetched'`; the title is stored as plain text with HTML entities decoded and whitespace collapsed |
| F01-AC5 | The *Title* field is left empty and the fetch fails (timeout, non-2xx, non-HTML `Content-Type`, redirect loop, or an empty/whitespace-only `<title>`) for `https://www.example.com/x` | I activate *Save bookmark* | **201** — not an error response. The stored row has `title = 'example.com'` (the hostname with a leading `www.` removed) and `title_source = 'hostname'`. The dialog closes and the **toast region** (`#toasts`, `aria-live="polite"`) shows exactly: `Couldn't fetch the title, so we used the domain instead. You can edit it anytime.` — **in place of** `Bookmark saved`, not queued behind it. The bookmark is still saved. *This is a declared deviation from `docs/mockup.html`, which shows the notice in the dialog's note region and holds it there ~1.5 s before closing. Ruled by dev-1 as C-F01-08; see §8 and `lld.md` §6* |
| F01-AC6 | The *Title* field is left empty and the target host never responds | I activate *Save bookmark* | The interval from submit to the 201 response is **≤ 5 s** measured at the API. The read is abandoned at 512 KB or after `</title>`, whichever comes first |
| F01-AC7 | The add dialog is open | I activate *Save bookmark* with *Web address* empty or containing only whitespace | `POST` returns **400** with `error.code = 'INVALID_URL'` and `error.field = 'url'`; the inline error region under the field reads exactly `Enter a web address to save.`; the field carries `aria-invalid="true"`; focus moves to the field; **no row is written** |
| F01-AC8 | The add dialog is open | I submit `example.com`, `http://localhost:3000`, `http://intranet`, or `//example.com/x` (no scheme, or a hostname with no dot) | **400** `INVALID_URL`; the inline error reads exactly `Enter a web address starting with http:// or https://.`; `aria-invalid="true"`; focus moves to the field; no row is written |
| F01-AC9 | The add dialog is open | I submit `javascript:alert(1)`, `file:///etc/passwd`, `ftp://example.com/x`, or `data:text/html,<script>` | **400** `INVALID_URL` with the same message as F01-AC8; **no outbound fetch is attempted**; no row is written; the value never reaches an `href` |
| F01-AC10 | The add dialog is open | I submit a URL of 2,049 characters | **400** `INVALID_URL`; the inline error reads exactly `That web address is too long (limit 2,048 characters).`; no row is written. A URL of exactly 2,048 characters is accepted |
| F01-AC11 | `https://example.com/a` is already saved and live | I submit `https://EXAMPLE.com/a` | **409** with `error.code = 'DUPLICATE_URL'` and `error.existingId` equal to the existing row's id; a banner with `role="alert"` appears above the fields reading `You already saved this link`, showing the existing bookmark's title and URL and offering *View existing* and *Edit existing*; **the bookmark count is unchanged** |
| F01-AC12 | `https://example.com/a` is already saved and live | I submit `https://example.com/a/`, `https://example.com/a#section`, `https://example.com:443/a`, or the punycode/unicode variant of the same host | Each yields **409** `DUPLICATE_URL`. `https://example.com/A` (different path case) yields **201** and is a separate bookmark |
| F01-AC13 | The *Title* field is empty and the submitted host resolves to a private, loopback, link-local, unspecified, multicast or reserved address — including `127.0.0.1`, `10.0.0.1`, `192.168.1.1`, `169.254.169.254`, `[::1]`, and an IPv4-mapped IPv6 form | I activate *Save bookmark* | **No TCP connection is opened to that address.** The response is **201**; the row has `title_source = 'hostname'` and the F01-AC5 notice is shown. The same holds when the address is reached only on redirect hop 2 or 3 |
| F01-AC14 | The add dialog is open with a valid new URL | I activate *Save bookmark* twice in rapid succession | Exactly **one** bookmark row exists for that URL. The submit control is disabled while the request is in flight |
| F01-AC15 | Three bookmarks were saved | The application process is stopped and started again, and `GET /api/bookmarks` is called | All three are returned with their original `id`, `url`, `title`, `title_source` and `created_at` values unchanged |
| F01-AC16 | The *Title* field is empty and the target page's `<title>` is `<script>alert(1)</script>Hello` | I activate *Save bookmark* | The stored `title` is the literal text, not HTML. When rendered, the characters appear on screen as text and **no script executes**; no `[innerHTML]` binding receives the value |
| F01-AC17 | The application is loaded in a browser with no bookmarks saved | I navigate using only the keyboard | The header, its *Add bookmark* button, the floating add button and the toast region are present. `Tab` reaches the *Add bookmark* button with a visible focus indicator; `Enter` opens the dialog; focus moves into the dialog and is trapped; `Esc` closes it and returns focus to the *Add bookmark* button. Every dialog input has a `<label for>` |

### Requirement coverage

| Requirement | Covered by |
|---|---|
| R01 | F01-AC1, F01-AC2, F01-AC4, F01-AC5, F01-AC6, F01-AC13 |
| R08 | F01-AC15 |
| R09 | F01-AC7, F01-AC8, F01-AC9, F01-AC10 |
| R10 | F01-AC11, F01-AC12 |
| R11 | F01-AC3, F01-AC5, F01-AC7, F01-AC8, F01-AC10, F01-AC11 |

## 3. Edge Cases

Inherited cases keep the `Found by` tag recorded in `specs/product-spec.md` §5. New cases raised while writing this spec are tagged `AI` and are prefixed `F01-EC`.

| EC ID | Scenario | Expected behavior | Found by |
|---|---|---|---|
| EC01 | Empty or whitespace-only URL submitted | Not saved. Inline message `Enter a web address to save.` (F01-AC7) | assignment |
| EC02 | URL with no scheme, e.g. `example.com` | Not saved as-is. Inline message naming the `http://` / `https://` requirement (F01-AC8) | assignment |
| EC03 | Non-http scheme: `javascript:`, `file:`, `ftp:`, `data:` | Rejected with the same message. Never fetched (F01-AC9) | assignment |
| EC04 | Overlong URL beyond 2,048 characters | Rejected with a message stating the limit (F01-AC10) | assignment |
| EC05 | Duplicate URL differing only by case, trailing slash, fragment or default port | Treated as the same bookmark. Save blocked; banner offers *View existing* / *Edit existing* (F01-AC11, F01-AC12) | assignment |
| EC06 | Title fetch times out, returns 404/500, returns non-HTML, or redirects in a loop | Bookmark still saved with the hostname as title and a non-blocking notice. Never longer than 5 s (F01-AC5, F01-AC6) | assignment |
| EC07 | Fetched page title contains HTML or a script tag | Stored as text and escaped on output. Nothing executes (F01-AC16) | assignment |
| EC08 | Fetched page is very large | Read capped at 512 KB and abandoned after `</title>`; the cap does not delay the save beyond 5 s (F01-AC6) | assignment |
| EC09 | URL resolves to a private, loopback, link-local or reserved address | No outbound fetch. The bookmark is still saved with the hostname as title (F01-AC13) | assignment |
| EC18 | Double-submit of the add form | One bookmark is created, not two (F01-AC14) | assignment |
| EC19 | Application restarted mid-write | No partially written bookmark survives; the list is consistent on restart. To test in `/test-phase` — F01-AC15 covers the clean-restart half only | assignment |
| EC20 | Host is an internationalized or unicode domain, e.g. `münchen.example` | Normalized consistently (IDNA/punycode) so the duplicate check cannot be fooled by two spellings of one host (F01-AC12) | AI |
| F01-EC1 | Hostname contains no dot: `http://localhost:3000`, `http://intranet`, `http://router` | Rejected with the F01-AC8 message before any fetch is considered. Ruled in by C-F01-02; carried into `hld.md` v2 by AMD-001, applied 2026-10-01 | AI |
| F01-EC2 | Host is an IP literal, including `http://127.0.0.1/`, `http://[::1]/`, `http://[::ffff:127.0.0.1]/`, `http://2130706433/` (decimal) and `http://0x7f.1/` (hex) | Accepted by the scheme and dot rules only where a dot is literally present, then **refused by the SSRF guard after resolution** — no connection, hostname fallback title. The decimal and hex forms must resolve and be checked, not pattern-matched | AI |
| F01-EC3 | Fetch succeeds (200, `text/html`) but `<title>` is absent, empty, or whitespace only | Treated as a fetch failure: hostname fallback and the F01-AC5 notice. `title` is never stored empty (INV-06) | AI |
| F01-EC4 | URL of exactly 2,048 characters, and of exactly 2,049 | 2,048 is accepted; 2,049 is rejected. The boundary is tested on both sides, not assumed (F01-AC10) | AI |
| F01-EC5 | Redirect chain whose first hop is public and whose second hop targets a private address | The guard re-runs on every hop; the chain is abandoned at the private hop. No connection is opened to it. At most 3 hops are followed (F01-AC13, RK02) | AI |

Fifteen of the seventeen map to an acceptance criterion. **EC19** and the DNS-rebinding half of **F01-EC2** are marked *to test* in `/test-phase`: both need a fault-injection harness rather than a user-visible behavior, so writing them as AC would state an outcome no UI step can observe.

## 4. Applicable NFRs

| NFR ID | How it applies to this feature |
|---|---|
| NFR-02 | F01-AC15 checks that saved bookmarks survive a stop/start. The bookmark insert is one transaction, so EC19 cannot leave a half-written row. This feature creates the SQLite file, the schema bootstrap and the WAL pragmas, so the whole NFR rests on F01's build even though F03 and F07 also read and write. |
| NFR-03 | F01-AC17 is the keyboard and label contract for the shell and the add dialog: visible focus, `<label for>` on every input, focus trapped in the dialog, `Esc` returning focus to the opener. The inline error (F01-AC7) and the fetch notice (F01-AC5) are text in `aria-live` regions, never colour alone. |
| NFR-04 | F01 owns the largest share: the scheme allow-list (F01-AC9), the dot rule (F01-AC8), the SSRF guard over DNS resolution and every redirect hop (F01-AC13, F01-EC5), plain-text storage and escaped output of a fetched title (F01-AC16), and parameterized inserts. The probe list in `product-spec` §4 is executed against this feature. |
| NFR-05 | F01-AC6 is the measurement: submit → 201 with a deliberately unresponsive endpoint, observed interval ≤ 5 s. |

**NFR-01 is deliberately not claimed by F01.** Search, filter and list timings at 1,000 records are measured on F03, F04 and F05. F01's only obligation toward it is that the insert path keeps `created_at` and the indexes correct.

## 5. Out of Scope

Behaviors another feature owns, or deferred work. None of these may appear in F01's acceptance criteria.

- **The bookmark list and its rendering, ordering, pagination and "no bookmarks yet" empty state (EC10)** — F03. F01 delivers the shell and the main region, but not the list inside it.
- **Tag entry on the add form: the chip input, tag normalization, the 8-tag limit, in-bookmark duplicate merging, and autocomplete (R02, R14, EC14, EC15, EC25)** — F02. The F01 dialog ships with *Web address* and *Title* only; F02 adds the tag row to the same dialog. Recorded as a known, temporary divergence from `docs/mockup.html` in §8.
- **Editing an existing bookmark, and excluding the edited record from its own duplicate check (R06, EC16)** — F06. F01 defines the duplicate rule and the 409 contract; F06 reuses them.
- **The destinations of the duplicate banner's two buttons.** F01 specifies that the banner exists and offers *View existing* and *Edit existing* (F01-AC11). *View existing* clearing the filters and scrolling to the row is verified in **F03**; *Edit existing* opening the edit form is verified in **F06**. F01 does not restate their acceptance criteria.
- **Delete, confirmation and undo (R07, R13)** — F07.
- **Search (R05) and tag filter (R04)** — F05, F04.
- **Theme toggle and its persistence (R12, EC26)** — F08.
- **Deferred enhancements**, per `product-spec` §2: import/export, favicon display, bulk actions, browser-extension capture, full-text search of page contents.

## 6. Effort and Risks

- **Estimate:** **M**, matching `product-spec` §3. The insert itself is small; the cost is concentrated in the SSRF-guarded fetcher (custom DNS `lookup`, per-hop re-validation, byte cap, one hard budget) and in the normalization rule that the duplicate index depends on. F01 also carries the project's first-run cost: the SQLite file, the schema bootstrap, the Express app assembly and the Angular shell all land here.

| Risk | Relevance to F01 | Handling |
|---|---|---|
| RK02 (SSRF guard is easy to get wrong) | **Highest-impact risk in the project lands in this feature.** DNS rebinding, redirect-to-private, IPv6 loopback and IPv4-mapped forms are all in scope here | Each bypass shape has its own edge case (F01-EC2, F01-EC5) and its own probe in `/test-phase`. Re-validate after every hop; connect to the validated address |
| RK06 (`better-sqlite3` native build on Windows) | F01's build is the **first `npm install`** in the project, so this risk is discovered here or not at all | Verify at first install. Documented fallback is `node:sqlite`, which would be a `/technology change persistence` run, not an F01 decision |
| RK01 (scope vs the 2026-10-05 date) | F01 is on the critical path — six of the seven remaining features depend on it directly or transitively | Keep F01 to the two fields in §5. Anything that can wait for F02 waits |
| **New — F01-RK1** | The mockup's fallback strips a leading `www.`, so two hosts that differ only by `www.` produce the same displayed title while remaining two distinct bookmarks. This is cosmetic, not a duplicate-detection flaw: `url_normalized` keeps `www.` and the two rows stay separate | Accepted, recorded so `/review-phase` does not raise it as a normalization bug |

## 7. Assumptions and Clarifications

| Q-ID | Question | Answer (human) | Date |
|---|---|---|---|
| C-F01-01 | The invalid-scheme message differs between `docs/mockup.html` (`Please enter a valid web address starting with http:// or https://`) and `hld.md` §8 (`Enter a web address starting with http:// or https://.`). Which is binding? | Use the HLD wording. | 2026-10-01 |
| C-F01-02 | The mockup rejects a hostname with no dot (`!u.hostname.includes('.')`); the HLD validation order only requires "hostname present", so `http://localhost:3000` would pass. Which behavior is binding? | Accept the mockup behavior — reject a dotless host — and update the HLD and the data model to match. | 2026-10-01 |
| C-F01-03 | The title-fetch-failure notice differs between the mockup and `hld.md` §8. Which is binding? | Use the mockup wording, and update the HLD to match. | 2026-10-01 |
| C-F01-04 | The mockup's hostname fallback strips a leading `www.`. Does the stored title for a failed fetch on `https://www.example.com/x` become `example.com` or `www.example.com`? | `example.com` — follow the mockup. | 2026-10-01 |
| C-F01-05 | Does F01's add form include the tag input, or does F02 add it? | F02 adds it. F01 ships *Web address* and *Title* only. | 2026-10-01 |
| C-F01-06 | Does F01 own the application shell (header, *Add bookmark* button, FAB, dialog host, toast region), or does F03? | F01 owns the shell. | 2026-10-01 |
| C-F01-07 | Who owns the duplicate banner, given its two buttons need F03 and F06? | F01 owns the 409 contract and the banner; the two buttons' destinations are verified in F03 and F06. | 2026-10-01 |
| C-F01-08 | F01-AC5 asked for the fetch-failure notice in "the note region below *Title*" **and** for the dialog to close, which read as self-contradictory during the build. It is not: `docs/mockup.html` lines 283–290 write the notice into `#tn`, `await sleep(1500)`, then `fd.close()` and toast. The mockup behaviour is reproducible, so this is a genuine choice, not a forced one. Which behaviour is binding? | Keep the shipped behaviour: the notice goes to the toast region, replacing `Bookmark saved`. Accept that this deviates from the UX reference and declare it. The change is documentation catching up to code that is already built and gate-approved. | 2026-10-01 |
| C-F01-09 | §8's U6 row says "Two" divergences, `lld.md` §6 says "Three", and `status.md` says "four". Which is right, and how is the drift prevented? | Stop counting. Name each deviation explicitly in §8 so the list cannot drift again. With C-F01-08 there are four. | 2026-10-01 |

**AS-F01-01.** The "no outbound request" assertions in F01-AC2, F01-AC9 and F01-AC13 are observed at the fetcher boundary (a stubbed resolver or connection recorder), not by packet capture. Reversible: a stricter observation method would not change the expected outcome.

## 8. Constitution Check

| Clause | Status | Note |
|---|---|---|
| P1 Specification before code | pass | This spec precedes the LLD and any code. No file under `app/` exists yet |
| P3 Honesty over polish | pass | No AC claims a verified result. F01-AC6 and F01-AC13 state what `/test-phase` must observe, not what is assumed to work |
| P4 Simplicity first | pass | Two fields, one dialog, no tag input, no background job (AD-03). Everything deferrable is in §5 |
| P7 Measurable requirements | pass | 17 AC, every one Given/When/Then with an observable outcome: an HTTP status and error code, an exact UI string, or a stored column value |
| Q1 Every AC testable | pass | 15 of 17 edge cases map to an AC; the other two are named as `/test-phase` items with a stated reason, not silently dropped |
| S1 Validation at the boundary | pass | F01-AC7–AC10 assert the **API** status and code, so a client-side-only check cannot satisfy them |
| S2 SSRF-guarded fetch | pass | F01-AC13, F01-EC2, F01-EC5 cover resolution, IP-literal forms and per-hop re-validation |
| S3 Output escaping | pass | F01-AC16 requires a `<script>` title to render as inert text with no `[innerHTML]` binding |
| S4 Parameterized queries | pass | F01-AC1 asserts stored state; the insert is a bound-parameter prepared statement per `data-model` §3 |
| A2/A5 Persistence | pass | F01-AC15 is a real stop/start check against the embedded SQLite file — no browser storage involved |
| A4 Component map | pass | `api` and `web` both exist in `component-map.json` v1 |
| U1/U2 Keyboard and labels | pass | F01-AC17 covers focus order, visible focus, focus trap, `Esc` return, and `<label for>` on every input |
| U3 Empty/loading/error states | partial | F01 covers the **error** and **loading** states of the add flow (inline error, duplicate banner, "Fetching title…" busy note). The list's empty state (EC10) is F03's, by §5 |
| U5 Actionable errors | pass | Every message in §2 says what happened and what to do. No AC exposes a stack trace, SQL fragment or internal id — `existingId` is a bookmark id the user already owns, not an internal identifier |
| **U6 Approved UX reference** | **deviation, declared** | Four accepted divergences from `docs/mockup.html`, named rather than counted so the list cannot drift (C-F01-09): **(a)** the invalid-scheme message uses the HLD wording `Enter a web address starting with http:// or https://.` (C-F01-01); **(b)** the dialog has no tag row until F02 lands (C-F01-05); **(c)** the fetch-failure notice uses an ASCII apostrophe `Couldn't` where the mockup line 286 uses `’` U+2019 (`lld.md` §6, Q5); **(d)** that notice renders in the toast region rather than the dialog's note region, and without the mockup's ~1.5 s hold (C-F01-08). Each must be written up with its reason in `lld.md` §6, as U6 requires. **(d) is a real loss, not a free win:** the mockup puts the message beside the *Title* field the user may want to edit, and the toast does not |
| D1 Synthetic data | pass | Every URL in this spec is under `example.com` / `example.org` / `example.net`, plus RFC-reserved private addresses used as probe targets |
| E1 Evidence | pass | E-planning-101 records this session's material interaction |

## 9. Change Log

| Date | Change | Why | Source |
|---|---|---|---|
| 2026-10-01 | Initial feature specification, draft | `/plan-phase F01-add-bookmark`, FEATURE-CREATE mode | planning |
| 2026-10-01 | Recorded C-F01-01…C-F01-07; adopted the mockup's dotless-host rejection and fetch-failure notice, and the HLD's invalid-scheme message; raised AMD-001 for the two architecture edits this implies | Three source conflicts between `docs/mockup.html` and `hld.md` were resolved by dev-1 | planning |
| 2026-10-01 | Status set to approved; backlog row set to `planned`; rolled up into `docs/01-planning.md` | Planning gate approved by dev-1 | planning |
| 2026-10-01 | **F01-AC5 amended** to describe the shipped behaviour: the notice renders in the toast region, replacing `Bookmark saved`, and the dialog closes. Added C-F01-08 and C-F01-09. §8's U6 row now **names** all four deviations instead of counting two. Status `approved` → `draft` → **re-approved the same day** by dev-1 | `/clarify F01-add-bookmark`, RECORD mode. The build had ruled AC5 self-contradictory; re-reading `docs/mockup.html` lines 283–290 showed it is **not** — the mockup holds the notice ~1.5 s then closes, so both halves are reproducible. dev-1 chose to keep the shipped toast behaviour and declare the deviation honestly rather than rework gate-approved code | planning |
| 2026-10-01 | Retired the header's "Blocked on AMD-001 for design" note | Cleanup, not a clarification: AMD-001 was approved and applied the same day, `lld.md` was written and gate-approved against its result, and both AMD-002 and a `lld.md` CHANGE-mode revision have landed since — the note was stale and the requested fix is direct cleanup, not a `/clarify` ruling | planning |
