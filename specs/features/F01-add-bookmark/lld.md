# F01: Add Bookmark (Low-Level Design)

**Feature ID:** F01-add-bookmark
**Status:** approved — design gate approved by dev-1 on 2026-10-01; **revised and re-approved 2026-10-01** (LD-04 wording and the §6 AC5 justification, following AMD-002 and the `/clarify` C-F01-08 ruling)
**Spec version:** 1, revised 2026-10-01 — `spec.md` approved 2026-10-01, re-approved the same day after F01-AC5 was amended (C-F01-08, C-F01-09). The file carries no numeric version field; `1` denotes its initial approved revision, now current
**HLD version:** 2
**Data model version:** 3 — bumped by AMD-002 (INV-02's trailing-slash rule)
**Component map version:** 1
**Components affected:** `api`, `web` — both resolved from `specs/architecture/component-map.json` v1

> Design only. No application code exists yet: `app/` is absent from the repository at the time of writing, confirmed by a file search. Nothing in this document is claimed as verified behavior; every "the code will…" statement is an instruction to `/build-feature`, and every expected outcome is checked for the first time in `/test-phase F01-add-bookmark`.

## 1. Design Overview

F01 creates the project. It scaffolds both components, brings up the SQLite file and its schema, and delivers one complete vertical slice: a user opens a dialog from the application shell, types a web address and optionally a title, and gets back either a saved bookmark or a specific, actionable message.

The work concentrates in three `api` modules that later features reuse rather than reimplement — a URL validator, a URL normalizer, and an SSRF-guarded title fetcher — plus the `bookmark` repository and the create service that orchestrates them. The validator and normalizer are shared verbatim with F06 through HLD §6.3; the fetcher is the single outbound network path in the entire system and carries RK02, the project's highest-impact risk.

On the `web` side F01 owns the shell (header, *Add bookmark* button, floating add button, dialog host, toast region) per clarification C-F01-06, and the add dialog with *Web address* and *Title* only — the tag row arrives with F02 (C-F01-05). The bookmark list, its ordering, pagination and empty state belong to F03; F01 leaves the main region as a neutral placeholder.

Two endpoints beyond the create path are included deliberately (LD-03): a minimal `GET /api/bookmarks` and `GET /api/tags`, because `component-map.json` declares both in the `api` smoke contract and F01-AC15 calls the first one by name. Both are intentionally feature-poor and are extended by F03 and F02.

## 2. Alternatives Considered

All four decisions below were presented to dev-1 with option tables on 2026-10-01 and answered with "Accept Recommendation" for each. Q5 (§6, U6 typography deviation) was answered the same way and is recorded in §6 rather than here, because it selects a string rather than a design.

### LD-01 Test seam for the SSRF-guarded title fetcher

The fetcher must be provable against F01-AC13 ("**No TCP connection is opened to that address**"), F01-EC5 (a private address reached only on redirect hop 2 or 3) and F01-AC6 (≤ 5 s with an unresponsive host). AS-F01-01 already fixes the observation point as the fetcher boundary rather than packet capture, so the question is what that boundary looks like in code.

| Option | Pros | Cons |
|---|---|---|
| **A: `createTitleFetcher({ lookup, request, clock })` factory; production wires `node:dns.lookup`, `node:https`/`node:http` and the real clock** | AC13, AC6, EC5 and EC2 become deterministic unit tests with no network and no timers (complexity: one factory). Directly serves NFR-04's probe list and RK02, because each bypass shape gets its own assertion. Testability is the highest of the three — the fake `lookup` *is* the DNS-rebinding harness. Q4 measures the service layer, and this keeps the fetcher inside it | One indirection. A hand-written fake `request` can drift from Node's real API, so a fetcher that passes every unit test could still fail against a real socket |
| B: export a pure `isBlockedAddress(ip)` predicate and test that directly; the fetcher uses `node:dns` and `node:https` unwrapped | No indirection at all; the predicate is the part most likely to contain the bug, and it is trivially table-testable | AC13 asserts the **fetcher** opens no connection, and with no seam only the predicate is observable. EC5 (per-hop re-validation) and the DNS-rebinding case need control over resolution that this does not provide. Change cost is high later: retrofitting a seam once the fetcher has callers is worse than starting with one |
| C: `vi.mock('node:dns')` / `vi.mock('node:https')` in the Vitest specs | Production code keeps its plainest possible shape | Mocks are module-global and couple the tests to core-module internals rather than to this project's contract. The assertion moves far away from the code under test, which is the wrong trade for the component RK02 names as the easiest in the project to get wrong. Express 5 / Node 24 internals are also a moving target the tests would then depend on |

**Decision:** A, with one addition — a single integration test that runs the **real** fetcher against a loopback HTTP server started by the test, so the fake `request` is kept honest. (dev-1, 2026-10-01, "Accept Recommendation")
**Trade-off accepted:** one factory indirection in production code, and the standing obligation that the fake never diverges from Node's API unnoticed. The loopback test is the mitigation, and it is the only F01 test that opens a socket.
**Challenge applied** (per the `design-alternatives` skill): *what breaks on a title-fetch failure, on restart, at 1,000 records, keyboard-only?* The fetch-failure question changed nothing here but fixed the fetcher's return contract — `fetchTitle` returns `{ ok: false, reason }` and **never throws**, because HLD §8 makes a failed fetch a 201, not an error, so an exception escaping the fetcher would turn a specified success into a 500. Restart and 1,000 records do not touch this decision; keyboard-only does not either.

### LD-02 Making F01-AC14 true against the API, not only the UI

AC14 requires that a double-submit produce exactly **one** row. The client disabling its submit button satisfies the UI half, but the API is reachable directly with `curl`, which S1 says is the case that counts.

| Option | Pros | Cons |
|---|---|---|
| **A: client disables submit **and** the repository translates a `SQLITE_CONSTRAINT_UNIQUE` violation on `ux_bookmark_url_live` into the same 409 `DUPLICATE_URL` response the pre-insert lookup produces** | Closes the check-then-insert window at the data level, where INV-03 already lives. Holds for any client, which is what S1 requires. No new state, no new table, no new setting. Security impact positive: the invariant is enforced by the database rather than by a code path that can be bypassed | Two code paths now produce a 409 and both must return a byte-identical body, so the constraint path needs one follow-up `SELECT` to fill `existingId` and the banner `details`. One extra query on a path that should almost never execute |
| B: client submit-disable only, trusting the pre-insert lookup | Simplest possible; no error-translation code | AC14 would be true only for a well-behaved client. Two concurrent `POST`s can both pass the lookup before either inserts, and the resulting failure surfaces as an unhandled constraint error — a 500 with a SQL fragment, which U5 forbids outright |
| C: wrap the lookup and the insert in one `BEGIN IMMEDIATE` transaction | Closes the race without an error-translation path | `better-sqlite3` is synchronous in a single process, so the window is already narrow; this adds a transaction mode to reason about while the constraint can still fire for reasons this does not cover (for example a restore racing a create, HLD §6.4). It buys less than it costs |

**Decision:** A (dev-1, 2026-10-01, "Accept Recommendation")
**Trade-off accepted:** one extra `SELECT` on the rare constraint path, and a standing requirement that the two 409 producers stay identical — asserted by a test that drives both paths and compares the response bodies.
**Challenge applied:** *on restart?* The constraint path must not leave a partial write. The insert is already one transaction per `data-model.md` §5, so a rejected insert rolls back whole and nothing is stranded. *At 1,000 records?* The lookup is an index seek on `ux_bookmark_url_live`; volume is irrelevant.

### LD-03 What F01 ships beyond the create path (the F03 boundary)

`component-map.json` v1 declares the `api` smoke contract as `GET /api/health`, `GET /api/bookmarks` and `GET /api/tags`, all expecting 200. The `build-verify-loop` skill runs that contract after **every** task, and F01-AC15 names `GET /api/bookmarks` explicitly. Meanwhile `spec.md` §5 gives the list, its ordering, pagination and empty state to F03.

| Option | Pros | Cons |
|---|---|---|
| **A: F01 adds a *minimal* `GET /api/bookmarks` (live rows, newest-first, no `q`/`tag`/`page`/`size`) and `GET /api/tags` (the documented tag-list query, which returns `[]` until F02 creates links). The web main region shows a neutral placeholder, not a list** | The declared smoke contract passes from F01-T01 onward, so P5 ("the app builds and runs after every task") is real rather than nominal. AC15 has an endpoint to call. No rendering, no pagination, no empty state — F03's scope is untouched | Both routes are opened again in F02 and F03. Two files get a second pass |
| B: create path only; leave the two declared smoke checks failing until F03 | No rework at all | Every build-verify run in F01 fails its own component's smoke contract, which makes the loop's signal worthless for eleven of the twelve tasks. AC15 would have no endpoint. Changing `component-map.json` instead would need an AMD for a purely sequencing reason |
| C: F01 ships the full list route — pagination, `q`, `tag`, ordering, empty state | No second pass on the route | Takes R03 and R15 from F03 and contradicts `spec.md` §5. Drags NFR-01 into a feature whose §4 explicitly disclaims it. Directly against P4 and the RK01 time box |

**Decision:** A (dev-1, 2026-10-01, "Accept Recommendation")
**Trade-off accepted:** `routes/bookmarks.js` and the list repository function are revisited by F03 (and `routes/tags.js` by F02). The scope line is drawn at *behavior*, not at file ownership: F01 may return rows, F01 may not render, order-by-preference, paginate or filter them.
**Challenge applied:** *at 1,000 records?* The minimal list route has no `LIMIT`, so it would return every live row — unacceptable once F03's seed exists. Recorded as a build constraint: the F01 route carries a fixed internal `LIMIT 50` with no client control, and F03 replaces it with the real paging contract. This changed the design; without the challenge the route would have been written unbounded.

### LD-04 How `url_normalized` (INV-02) is computed

| Option | Pros | Cons |
|---|---|---|
| **A: WHATWG `new URL()` (Node built-in), then drop the fragment, drop a default port, and drop one trailing `/` from the path whether or not it is otherwise empty; preserve path case and the query string** | Scheme and host lowercasing, and IDNA/punycode for EC20 and F01-AC12, come from the platform instead of from hand-written code — and IDNA is exactly the wheel EC20 exists to stop us reinventing. Zero dependencies (P4, `technology.md` TD-06 precedent). One function, shared with F06 by HLD §6.3, so EC05 and EC16 cannot drift | `new URL()` is deliberately permissive: it happily parses `javascript:alert(1)` and `http://localhost`. It is a parser, not a validator, so the scheme allow-list and the dot rule **must** run before it is trusted — an ordering requirement that becomes a correctness property and needs its own test |
| B: hand-written parse plus regex normalization | Total control over every step; no surprises from platform behavior changes | Re-implements IDNA, which is precisely the defect EC20 was raised to prevent, and adds more hand-written security-adjacent code on the feature that already carries RK02. Higher change cost and materially worse security posture for no requirement gain |

**Decision:** A (dev-1, 2026-10-01, "Accept Recommendation")
**Trade-off accepted:** normalization can never be used as a validator, and the order fixed in HLD §8 becomes a property under test (F01-T03), not a convention.
**Challenge applied:** *what breaks?* Two things surfaced and are recorded rather than assumed away — the IP-literal normalization table in §7.2, and the trailing-dot hostname gap in §12.

> **Revised 2026-10-01 (AMD-002).** The build session found that this wording ("when the path is exactly `/`") made the approved F01-AC12 unsatisfiable — `https://example.com/a/` and `https://example.com/a` never collided. dev-1 ruled for the broad reading on the spot, the shipped `app/api/src/services/url-normalize.js` already implements it, and `data-model.md` INV-02 was amended to match (AMD-002, applied 2026-10-01, `data-model.md` v2→v3). This row now states the same rule the code and the data model use; nothing in the code changed as a result of this revision.

## 3. Component Changes

Paths resolved through `specs/architecture/component-map.json` v1: `api` → `app/api` (workspaceRoot `.`), `web` → `app/web` (workspaceRoot `.`). Every file below appears in `tasks.md`.

| Component id | Resolved path | File (new/changed) | Responsibility |
|---|---|---|---|
| `api` | `app/api` | `package.json` (new) | Exact-pinned deps per `technology.md` §5: express 5.2.1, better-sqlite3 13.0.3, vitest 5.0.3, @vitest/coverage-v8 5.0.3, eslint 10.11.0, prettier 3.9.9. `"type": "module"`. Scripts mirror the component-map commands |
| `api` | `app/api` | `eslint.config.js`, `.prettierrc`, `vitest.config.js`, `.gitignore` (new) | Q3 tooling. `.gitignore` excludes `data/`, `public/`, `node_modules/` (HLD §4, D1) |
| `api` | `app/api` | `src/server.js` (new) | Entry point for `node src/server.js`. Bootstraps the schema **before** the listener opens (`data-model.md` §5), then binds `process.env.PORT ?? 3000` |
| `api` | `app/api` | `src/app.js` (new) | Express app assembly: JSON body parser with a size limit, the CSP header from HLD §8, route mounting, static serving of `public/`, and the single `AppError` → HTTP error middleware |
| `api` | `app/api` | `src/routes/health.js` (new) | `GET /api/health` → `200 { status: 'ok' }`. Smoke check 1 |
| `api` | `app/api` | `src/routes/bookmarks.js` (new) | `POST /api/bookmarks`, `GET /api/bookmarks`. HTTP only — parses the body, calls one service, maps the result to a status. No SQL, no rule (HLD §5) |
| `api` | `app/api` | `src/routes/tags.js` (new) | `GET /api/tags` → the documented tag-list query. Smoke check 3. Extended by F02 |
| `api` | `app/api` | `src/lib/app-error.js` (new) | `AppError { code, message, field?, status, details? }` plus the code→status map from HLD §8 |
| `api` | `app/api` | `src/lib/validate-url.js` (new) | The HLD §8 check order, stopping at the first failure. Returns the exact user message. Shared with F06 |
| `api` | `app/api` | `src/lib/address-range.js` (new) | `isBlockedAddress(ip, family)` — the IPv4 and IPv6 range table from HLD §8, as data plus a pure predicate. Pure, no I/O, exhaustively table-tested |
| `api` | `app/api` | `src/services/url-normalize.js` (new) | INV-02 normalization (LD-04 option A) and the `hostnameForTitle()` helper that applies the INV-06 leading-`www.` strip |
| `api` | `app/api` | `src/services/title-fetch.js` (new) | `createTitleFetcher({ lookup, request, clock })` (LD-01). SSRF guard, 5 s total budget, 512 KB cap, `text/html` only, at most 3 manually re-validated redirect hops, bounded-regex `<title>` extraction, entity decode, whitespace collapse, truncate to 300 |
| `api` | `app/api` | `src/services/bookmark-service.js` (new) | `create(payload)` and `listRecent()`. Orchestrates validate → normalize → duplicate lookup → title decision → transactional insert. The layer Q4 is measured on |
| `api` | `app/api` | `src/data/db.js` (new) | Connection, `PRAGMA journal_mode = WAL`, `synchronous = NORMAL`, `foreign_keys = ON` (INV-12). Creates `data/` if absent. Accepts a file path so tests can pass `:memory:` |
| `api` | `app/api` | `src/data/schema.js` (new) | Idempotent `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` for **all four** entities and **all four** indexes, inside one transaction, with `user_version = 1` |
| `api` | `app/api` | `src/data/bookmark-repository.js` (new) | Prepared statements only: `findLiveByNormalized`, `findLiveById`, `insert`, `listRecent`. Owns the create transaction |
| `api` | `app/api` | `src/data/tag-repository.js` (new) | `listWithLiveBookmarks()` — the `data-model.md` §3 tag-list query. Returns `[]` in F01 |
| `api` | `app/api` | `test/*.test.js` (new) | Vitest specs — see §11 |
| `web` | `app/web` | `ng new` scaffold + `proxy.conf.json` (new) | Angular 22.2.0 zoneless. TypeScript is whatever `ng new` pins and is **never** installed by hand (RK07). Dev proxy forwards `/api` to `http://localhost:3000` so no CORS middleware is needed (HLD §2) |
| `web` | `app/web` | `src/styles.css` (new) | Ported from `docs/mockup.html` — custom properties, header, dialog, field, error, note, banner, toast, FAB and the visible focus indicator (U1) |
| `web` | `app/web` | `src/app/app.ts`, `src/app/app.html` (changed from scaffold) | The shell: header with *Add bookmark*, the FAB, the dialog host, the `aria-live` toast region, and the neutral main-region placeholder |
| `web` | `app/web` | `src/app/core/models.ts` (new) | `Bookmark`, `TitleSource`, `ApiErrorBody` types mirroring §4 |
| `web` | `app/web` | `src/app/core/api.service.ts` (new) | `HttpClient` wrapper: `createBookmark()`, `listBookmarks()`. No axios (`technology.md` T07) |
| `web` | `app/web` | `src/app/core/api-error.ts` (new) | Maps an `HttpErrorResponse` to the §4 error body, with a safe fallback message when the body is missing or malformed |
| `web` | `app/web` | `src/app/state/bookmarks.store.ts` (new) | Signal store — `saving`, `fetchingTitle`, `fieldError`, `duplicate`, `titleNotice`, `lastSaved`. All UI-driving state is a signal (TD-09) |
| `web` | `app/web` | `src/app/features/bookmark-form/bookmark-form.{ts,html}` (new) | The `<dialog>`: two labelled inputs, inline error, duplicate banner, fetch notice, focus trap, `Esc` handling |
| `web` | `app/web` | `src/app/features/toast/toast.{ts,html}` (new) | The `aria-live="polite"` toast region |

**Generated, never authored:** `app/api/public/` is the output of `npx ng build` in `web` (HLD §4). It is git-ignored and no task writes a file into it by hand.

## 4. API / Interface Contract

Error bodies use the single shape fixed in HLD §8: `{ "error": { "code", "message", "field?", "existingId?", "details?" } }`.

| Method | Route / function | Input | Success response | Error responses |
|---|---|---|---|---|
| `POST` | `/api/bookmarks` | `{ url: string, title?: string }` (JSON) | `201 { bookmark: { id, url, title, title_source, created_at, updated_at } }` — `title_source` is `user` \| `fetched` \| `hostname`, and is how the client knows to show the F01-AC5 notice without a second round trip (AD-03) | `400 { error: { code: 'INVALID_URL', message, field: 'url' } }` — one of the three §7 messages.<br>`409 { error: { code: 'DUPLICATE_URL', message: 'You already saved this address.', field: 'url', existingId, details: { title, url } } }`.<br>`400 { error: { code: 'INVALID_URL', message: 'That title is too long (limit 140 characters).', field: 'title' } }`.<br>`500 { error: { code: 'STORAGE_ERROR', message: 'TagVault could not save that. Your other bookmarks are safe — try again.' } }` |
| `GET` | `/api/bookmarks` | none in F01 (`q`, `tag`, `page`, `size` are **ignored** and are added by F03/F04/F05) | `200 { items: Bookmark[], total: number }` — live rows only, `ORDER BY created_at DESC, id DESC`, internal fixed `LIMIT 50` (LD-03 challenge) | `500 STORAGE_ERROR` |
| `GET` | `/api/tags` | `prefix` ignored in F01 (added by F02) | `200 []` in F01 — the real query runs but no `bookmark_tag` row exists yet | `500 STORAGE_ERROR` |
| `GET` | `/api/health` | none | `200 { status: 'ok' }` | — |
| function | `validateUrl(raw)` → `{ ok: true, url } \| { ok: false, message }` | the raw submitted string | the trimmed URL string | never throws; the message is one of the three §7 strings verbatim |
| function | `normalizeUrl(url)` → `string` | a URL that has **already** passed `validateUrl` | `url_normalized` per INV-02 | throws only on a precondition breach (caller bug), never on user input |
| function | `createTitleFetcher({ lookup, request, clock })` → `fetchTitle(url)` | a validated URL | `{ ok: true, title }` | `{ ok: false, reason }` for refused / timeout / non-HTML / 4xx-5xx / redirect loop / hop limit / empty `<title>`. **Never throws** — HLD §8 makes a failed fetch a 201, so an escaping exception would turn a specified success into a 500 |
| function | `isBlockedAddress(ip, family)` → `boolean` | a resolved address | `true` when the address is private, loopback, link-local, unspecified, multicast or reserved | pure; no error path |

**Every acceptance criterion is reachable from this table or from §6:** AC1/AC2/AC4/AC5/AC6/AC13/AC16 via `POST` 201; AC7–AC10 via `POST` 400; AC11/AC12 via `POST` 409; AC14 via `POST` plus §6's submit-disable; AC15 via `GET /api/bookmarks` after a restart; AC3 and AC17 via §6.

## 5. Data Access

**Tables/entities used** — all already defined in `data-model.md` v2. No entity, field, index or invariant is added, changed or removed by this feature.

| Entity | F01 use |
|---|---|
| `bookmark` | Read (`url_normalized` lookup, by id, recent list) and write (insert). All eight fields |
| `tag` | Read only, via the tag-list query. No write in F01 (F02 owns tag creation) |
| `bookmark_tag` | Created by the schema bootstrap and read by the tag-list join. No row is written in F01 |
| `setting` | Created by the schema bootstrap only. Not read or written in F01 (F08 owns it) |

**Indexes used:** `ux_bookmark_url_live` (duplicate lookup and the LD-02 constraint), `ix_bookmark_list` (the recent list), `ix_bookmark_tag_lookup` and `ux_tag_name` (created by the bootstrap, exercised from F02 onward).

**Queries** — all prepared statements with bound parameters (S4). No value is ever concatenated into SQL, and `ORDER BY` is a fixed constant string.

| Function | Statement (described) |
|---|---|
| `findLiveByNormalized(urlNormalized)` | `SELECT id, url, title FROM bookmark WHERE url_normalized = ? AND deleted_at IS NULL` — index seek on `ux_bookmark_url_live`. Serves AC11, AC12 and the LD-02 follow-up |
| `findLiveById(id)` | `SELECT … FROM bookmark WHERE id = ? AND deleted_at IS NULL` — used only by the LD-02 constraint path |
| `insert(row)` | `INSERT INTO bookmark (url, url_normalized, title, title_source, created_at, updated_at, deleted_at) VALUES (?,?,?,?,?,?,NULL)` — wrapped in one `better-sqlite3` transaction (`data-model.md` §5, EC19). `created_at` and `updated_at` are bound to the **same** captured instant, as AC1 asserts |
| `listRecent()` | `SELECT … FROM bookmark WHERE deleted_at IS NULL ORDER BY created_at DESC, id DESC LIMIT 50` — satisfied by `ix_bookmark_list`. The `LIMIT` is an internal constant, not client-controlled; F03 replaces it with the real paging contract |
| `countLive()` | `SELECT COUNT(*) FROM bookmark WHERE deleted_at IS NULL` — supplies `total`. F03 replaces it with the shared-predicate version required by AD-07 |
| `listWithLiveBookmarks()` | The `data-model.md` §3 tag-list query verbatim: `SELECT t.name, COUNT(*) AS n FROM tag t JOIN bookmark_tag bt ON bt.tag_id = t.id JOIN bookmark b ON b.id = bt.bookmark_id WHERE b.deleted_at IS NULL GROUP BY t.id ORDER BY t.name` |

**Schema bootstrap** creates all four tables and all four indexes idempotently, inside one transaction, before the listener opens, and sets `user_version = 1`. It is written once, here, because every later feature depends on the same file existing with the same shape. `PRAGMA foreign_keys = ON` is executed on **every** connection — INV-12 records that SQLite defaults it off and that a missed pragma silently disables every foreign key in the model, so `db.js` sets it and a test asserts it.

**Timestamps** are ISO-8601 UTC strings produced by an injectable `now()` so tests can assert AC1's "same instant" without racing a real clock.

## 6. UI Changes and States

Ported from `docs/mockup.html` (U6): the header bar, the `<dialog>` markup and ids, the field/error/note/banner classes, the toast, and the FAB. The tag row present in the mockup's form is **not** ported in F01 (C-F01-05, declared below).

| View/component | Loading | Empty | Error | Success | Accessibility notes |
|---|---|---|---|---|---|
| **App shell** (header, *Add bookmark*, FAB, dialog host, toast region) | n/a — static, no data fetch in F01 | n/a | n/a | n/a | `Tab` reaches *Add bookmark* with a visible focus indicator; `Enter` opens the dialog (AC17). Real `<button>` elements, never a styled `div`. The FAB carries `aria-label="Add bookmark"` because it renders an icon only |
| **Main region placeholder** | n/a in F01 | Static neutral text; **not** the R03 empty state, which is F03's by `spec.md` §5 and must not be pre-empted here | n/a | n/a | `<main>` landmark present so the shell is navigable before F03 fills it |
| **Add bookmark dialog** | Submit control disabled; the note region under *Title* reads `Fetching title…` with `aria-busy="true"` (AC14, and the mockup's `note busy` class) | n/a — a form, not a list | Inline error under *Web address*: exact §7 message, `aria-invalid="true"` on the input, focus moved to the input (AC7–AC10) | Dialog closes; a toast appears (AC3) | Native `<dialog>` with `showModal()`: focus moves in, is trapped, `Esc` closes and focus returns to the opener (AC17). `<label for="u">Web address</label>` and `<label for="t">Title …</label>`; the *Title* input carries `maxlength="140"` (INV-05). Both message regions are `aria-live="polite"` and referenced by `aria-describedby`, so they are announced as text, never signalled by colour alone (U2) |
| **Duplicate banner** | n/a | n/a | `role="alert"` banner above the fields: `You already saved this link`, then the existing bookmark's title and URL, then *View existing* and *Edit existing* (AC11) | n/a | `role="alert"` announces without moving focus; both actions are real buttons and are in the tab order. Title and URL are rendered by Angular interpolation only |
| **Title-fetch notice** | The note region under *Title* shows `Fetching title…` while in flight (AC3, AC14) | n/a | Not an error state — the save **succeeded** (HLD §8) | Announced in the **toast region**, replacing `Bookmark saved`: `Couldn't fetch the title, so we used the domain instead. You can edit it anytime.` (AC5) — see the note below on why it is not the dialog's note region | `aria-live="polite"`; plain text, no colour-only signal |
| **Toast region** | n/a | n/a | n/a | `Bookmark saved` (AC3), or the AC5 title-fallback notice in its place | `aria-live="polite"` container present in the shell from first paint, so the first message is announced (an element inserted *with* its text is not reliably announced) |

**Where the AC5 notice is rendered — ruled by dev-1 as Q1 on 2026-10-01, during F01-T11; justification corrected 2026-10-01 following a `/clarify` finding.**

`docs/mockup.html` lines 283–290 render the fetch-failure notice into `#tn`, the dialog's own note region, hold it there with `await sleep(1500)` so it can be read, and only then call `fd.close()` and show the `Bookmark saved` toast. **Both halves of F01-AC5 are therefore reproducible** — the note-region placement and the dialog closing are not in conflict, contrary to what this section originally claimed. dev-1 chose to keep the shipped behavior anyway: the notice is announced in the existing `#toasts` region, `aria-live="polite"` and present from first paint, and **replaces** `Bookmark saved` rather than queueing behind it. **The message text is unchanged**; only its container differs from the UX reference.

This is now recorded as a genuine, declared **deviation from `docs/mockup.html` (U6)**, not as a forced substitution: reproducing the mockup exactly would cost a ~1.5 s hold before the dialog can close, during which the submit control stays disabled (per the mockup's `sv.disabled=true` / re-enable around the same block). dev-1 weighed that stall against the toast's lower cost — the user loses the notice appearing beside the *Title* field they may want to edit, which `spec.md` §8 now states plainly (C-F01-08). Two alternatives were rejected, for reasons that still hold regardless of which rendering is chosen: keeping the dialog open on a `hostname` title (forces an unasked-for editing flow into F01), and rendering in both places (two polite regions announcing at once). No code changed as a result of this correction — only the reason recorded here.

**Destructive actions (U4):** none in F01. Delete, its confirmation and its undo are F07's.

### U6 deviations — declared, with reasons

`spec.md` §8 requires these to be written up here, named rather than counted (C-F01-09) so the list cannot drift. Four, all additive or textual; none changes the reference's layout, state coverage or interaction patterns.

| Deviation | Reason |
|---|---|
| The invalid-scheme message is the HLD wording `Enter a web address starting with http:// or https://.` rather than the mockup's `Please enter a valid web address starting with http:// or https://` | Ruled by dev-1 as C-F01-01 on 2026-10-01. AMD-001 §1 item 1 records the ruling and explicitly states it needs no architecture change, only this declaration |
| The dialog has **no** tag row — no `Tags` label, no chip input, no `datalist` — until F02 lands | Ruled by dev-1 as C-F01-05. A temporary divergence, not a permanent one: F02 adds the row to this same dialog. Keeping it out of F01 keeps the feature at the two fields `spec.md` §5 fixes, against RK01 |
| The title-fetch notice uses an **ASCII** apostrophe — `Couldn't` — where `docs/mockup.html` line 286 uses the typographic `’` (U+2019) | **Q5, ruled by dev-1 on 2026-10-01.** The one-character difference was found while resolving this design. Every other artifact already carries the ASCII form — `spec.md` F01-AC5, `hld.md` §8, AMD-001 §2 (which claims to quote the mockup exactly), and `docs/01-planning.md` — so matching the mockup byte-for-byte would leave four artifacts wrong and would need an AMD plus a spec revision to fix one character. AC5 says the note shows the string *exactly*, so the test asserts the ASCII form. `/review-phase` must read this row rather than raise a finding |
| The fetch-failure notice (F01-AC5) is announced in the toast region and the dialog closes **without** the mockup's ~1.5 s hold in the note region first | **C-F01-08, ruled by dev-1 via `/clarify` on 2026-10-01.** Both halves of the mockup's behavior are reproducible (see the note above this table); this is a genuine choice, not a forced one. dev-1 chose to avoid the stall. Cost, stated rather than hidden: the notice no longer appears beside the *Title* field the user may want to edit |

## 7. Validation Rules

All validation is performed in `api` at the boundary and is the only validation that counts (S1). The Angular form repeats the cheap checks purely so the user gets feedback without a round trip; the tests in F01-T03 assert the **API** status and message, so a client-only check cannot satisfy them.

### 7.1 Rules and exact messages

Order is fixed by HLD §8 and stops at the first failure, so the message is always specific to the actual fault.

| # | Field | Rule | User message |
|---|---|---|---|
| 1 | `url` | trim; must not be empty or whitespace-only | `Enter a web address to save.` |
| 2 | `url` | length ≤ 2,048 characters after trimming (2,048 accepted, 2,049 rejected — F01-EC4) | `That web address is too long (limit 2,048 characters).` |
| 3 | `url` | must parse with `new URL()` | `Enter a web address starting with http:// or https://.` |
| 4 | `url` | scheme ∈ {`http`, `https`} | `Enter a web address starting with http:// or https://.` |
| 5 | `url` | hostname present **and contains at least one dot** (`hld.md` v2 §8, INV-01, AMD-001) | `Enter a web address starting with http:// or https://.` |
| 6 | `title` | trim; ≤ 140 characters when supplied by the user (INV-05, the mockup's `maxlength="140"`) | `That title is too long (limit 140 characters).` |

Rules 3, 4 and 5 deliberately share one message. F01-AC8 and F01-AC9 both assert that exact string, and AMD-001 §2 states the `INVALID_URL` message column is unchanged by the dot rule — a dotless host reuses the existing string. Telling the user *which* of the three shapes they got wrong would leak parser detail without helping them.

Rule 6 is a defence-in-depth boundary check. `maxlength="140"` stops it in the browser; a direct API call is the case S1 cares about. No acceptance criterion exercises it, so it is recorded here as a rule the review can check rather than claimed as tested.

### 7.2 Where the checks sit relative to normalization (LD-04)

`new URL()` is a **parser, not a validator**. It parses `javascript:alert(1)` and `http://localhost` without complaint. The scheme allow-list and the dot rule therefore run on the parse result *before* `normalizeUrl()` is called, and F01-T03 asserts that ordering directly rather than trusting it.

The dot rule is evaluated against `u.hostname` — the WHATWG-parsed host — exactly as `docs/mockup.html` does (`!u.hostname.includes('.')`). That choice has consequences worth stating, because F01-EC2 requires IP literals to "resolve and be checked, not pattern-matched":

| Submitted literal | `u.hostname` after parsing (design intent) | Outcome |
|---|---|---|
| `http://localhost:3000` | `localhost` | **400** `INVALID_URL` — no dot. Never reaches the resolver (F01-EC1) |
| `http://intranet`, `http://router` | `intranet`, `router` | **400** — no dot |
| `http://[::1]/` | `[::1]` | **400** — no dot. Refused *earlier* than the guard would refuse it |
| `http://[::ffff:127.0.0.1]/` | `[::ffff:7f00:1]` | **400** — no dot after IPv6 compression |
| `http://2130706433/` (decimal) | `127.0.0.1` — the WHATWG IPv4 parser expands it | passes rules 3–5, then the **guard refuses after resolution**. `201`, `title_source = 'hostname'`, AC5 notice |
| `http://0x7f.1/` (hex/short form) | `127.0.0.1` | same as above |
| `http://127.0.0.1/`, `http://10.0.0.1/`, `http://192.168.1.1/`, `http://169.254.169.254/` | unchanged | same as above — dots present, guard refuses, `201` with the hostname fallback (F01-AC13) |
| `https://private.example.com` resolving to `::1` | `private.example.com` | passes; the guard refuses **after** resolution. `201`, `title_source = 'hostname'` (F01-AC13, F01-EC5) |

**Reading confirmed by dev-1 at the design gate, 2026-10-01.** F01-AC13's *Given* is "the submitted host **resolves to** a private … address — including `127.0.0.1`, … `[::1]`, and an IPv4-mapped IPv6 form", and it closes with "The same holds when the address is reached only on redirect hop 2 or 3". That list is a list of **resolved addresses**, not of literal URLs the user types. Under the confirmed reading F01-AC13 and F01-EC2 agree completely and the table above satisfies both: a host that *resolves to* `[::1]` yields **201** with `title_source = 'hostname'`, while the literal string `http://[::1]/` is refused at rule 5 with **400** because it carries no dot. The competing reading — that `[::1]` typed literally must still yield 201 — was put to dev-1 with its two costs (a `/clarify` revision of AC13, or AMD-002 to widen INV-01) and **rejected**; INV-01 stands unchanged and no amendment is raised.

> `spec.md` itself was not edited. The ruling lives here and in `status.md`, because `/design-feature` owns neither `spec.md` nor the architecture files. If the same ambiguity trips `/test-phase` or `/review-phase`, the durable fix is a one-line `/clarify F01-add-bookmark` REVISE of F01-AC13 that says "resolves to" where it currently lists literals — worth doing, but not worth blocking the build on.

The IPv4 expansions in the table above are **design intent, not verified behavior** — no command has been run and no code exists. F01-T03 asserts each row, and any row that turns out wrong is a finding, not a silent correction.

## 8. Error Handling

| Condition | Detected where | Response / UI feedback |
|---|---|---|
| Empty / whitespace-only URL (EC01, AC7) | `validate-url.js` rule 1, at the API boundary | `400 INVALID_URL` `field: 'url'`. Inline text under the field, `aria-invalid="true"`, focus moved to the field. **No row written** |
| No scheme, non-http(s) scheme, or dotless host (EC02, EC03, F01-EC1, AC8, AC9) | `validate-url.js` rules 3–5 | `400 INVALID_URL` with the shared message. **No outbound fetch is attempted** — rejection precedes any resolution. The value never reaches an `href` |
| URL longer than 2,048 characters (EC04, AC10) | `validate-url.js` rule 2 | `400 INVALID_URL` with the limit message |
| User title longer than 140 characters | `bookmark-service.js` boundary check (rule 6) | `400 INVALID_URL` `field: 'title'` |
| Duplicate of a live bookmark, found before insert (EC05, EC20, AC11, AC12) | `bookmark-service.js` via `findLiveByNormalized` | `409 DUPLICATE_URL` with `existingId` and `details { title, url }`. Banner `role="alert"`, bookmark count unchanged |
| Duplicate detected only by the unique index (LD-02 race, AC14) | `bookmark-repository.js` catches `SQLITE_CONSTRAINT_UNIQUE` on `ux_bookmark_url_live`, re-reads the live row, rethrows as `AppError` | **Byte-identical** `409 DUPLICATE_URL` body. A test drives both paths and compares the responses |
| Title fetch refused by the SSRF guard (EC09, F01-EC2, AC13) | `title-fetch.js` before any socket opens | **`201`** — not an error. `title = hostname minus leading www.`, `title_source = 'hostname'`, AC5 notice shown |
| Title fetch times out, returns 4xx/5xx, returns non-HTML, loops, exceeds 3 hops, or yields an empty/whitespace-only `<title>` (EC06, F01-EC3, AC5) | `title-fetch.js` | **`201`** with the same fallback and the same notice. The fetch failing is **never** an error response (HLD §8) |
| Title fetch exceeds the 5 s budget (AC6, NFR-05) | `title-fetch.js` single total budget across resolve + connect + response + read | Fetch abandoned, `{ ok: false, reason: 'timeout' }`, `201` within the budget |
| Database failure on insert | `bookmark-repository.js` → error middleware | `500 STORAGE_ERROR`, message `TagVault could not save that. Your other bookmarks are safe — try again.` The full detail — stack, SQL, driver code — goes to the **server console only** (U5) |
| Any unexpected throw in a route or service | the single `app.js` error middleware | `500 STORAGE_ERROR` with the same safe message. Express 5 routes rejected promises to the error middleware, so no `try/catch` is needed per handler (`technology.md` TD-02) |
| Network failure or a malformed/absent error body on the client | `web` `api-error.ts` | A safe generic message in the inline error region. The client never renders a raw `HttpErrorResponse`, a status line or a stack |

**Two rules this table encodes.** A failed title fetch is not a failure of the request. And no user-facing message contains a stack trace, a SQL fragment, a driver error code or an internal identifier — `existingId` is a bookmark id the user already owns, which `spec.md` §8 already records as compliant with U5.

**One note on the 409 message.** The API's `error.message` is HLD §8's `You already saved this address.` The banner heading F01-AC11 asserts is `You already saved this link` — the mockup's constant, rendered by the client. These are two different strings for two different channels and are not a conflict: AC11 fixes what is **rendered**, and the API message serves direct API consumers and the server log. The client renders the banner constant plus `details`, and does not display `error.message` for this code. Recorded so `/review-phase` does not read it as one.

## 9. Security Considerations

One row per untrusted input F01 touches, per the `secure-input-handling` skill.

| Untrusted input | Control applied | Constitution clause |
|---|---|---|
| Submitted URL — scheme | Allow-list `{http, https}` evaluated on the parsed scheme **before** normalization and before any resolution. `javascript:`, `file:`, `ftp:`, `data:` are rejected with `400`; no outbound call is attempted and no row is written (AC9) | **S1**, S2 |
| Submitted URL — host shape | Hostname must be present and contain a dot. Removes every single-label name — which by definition resolves only on this machine or this LAN — before the resolver is consulted at all (AMD-001, RK02) | **S1**, S2 |
| Submitted URL — length | ≤ 2,048 after trimming, checked before parsing, so no unbounded string reaches the parser | **S1** |
| Submitted URL — storage | Bound parameter on insert; never concatenated into SQL | **S4** |
| Submitted URL — rendering | Displayed through Angular interpolation only. An `href` is constructed **only** from a URL that passed the scheme check, so a `javascript:` value can never become a live link. No `[innerHTML]` | **S3** |
| Outbound fetch target — address | Resolve the hostname, then reject if **any** resolved address is private, loopback, link-local, unspecified, multicast or reserved: IPv4 `0/8, 10/8, 100.64/10, 127/8, 169.254/16, 172.16/12, 192.168/16, 224/4, 240/4`; IPv6 `::1, ::, fc00::/7, fe80::/10` and IPv4-mapped forms; plus the literal `localhost`. Connect to the **validated address** through the injected `lookup`, so there is no DNS-rebinding window between the check and the socket | **S2** |
| Outbound fetch target — redirects | Redirects are **not** followed by the HTTP client. They are followed manually, at most 3 hops, re-running the entire address check on every hop (F01-EC5, RK02) | **S2** |
| Outbound fetch — response | `Content-Type: text/html` only; read capped at 512 KB and abandoned after `</title>`; one hard 5 s total budget across resolve, connect, response and read; no cookies, no credentials, a fixed honest User-Agent | **S2**, NFR-05 |
| Fetched page title — content | Entities decoded, whitespace collapsed, truncated to 300, stored as **plain text, never HTML**. Rendered by Angular interpolation, so `<script>alert(1)</script>Hello` appears on screen as literal characters and nothing executes (AC16). `[innerHTML]` is prohibited outright for this value | **S3** |
| Fetched page title — storage | Bound parameter | **S4** |
| User-supplied title | Trimmed, ≤ 140 at the boundary, stored as plain text, bound parameter, escaped on output | **S1**, S3, S4 |
| Request body shape | JSON body parser with a size limit. Unknown keys are ignored rather than spread into the row — `id`, `title_source`, `created_at` and `deleted_at` are **never** taken from the request, so a client cannot forge `title_source: 'user'` to suppress the fetch or backdate `created_at` | **S1** |
| Served application | `Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'` set in `app.js`, so even a successful injection has no script origin to load from | **S3** |
| Dependencies | Exact versions pinned from `technology.md` §5, lockfile committed, `npm audit --omit=dev` run per component in `/review-phase` with the **actual** output recorded | **S5** |

**Not applicable in F01:** search text and tag input (S6) — F05 and F02 own them; F01 writes no `LIKE` pattern and accepts no tag.

## 10. Sequence

```mermaid
sequenceDiagram
  actor U as User
  participant W as web (Angular, signals)
  participant R as api routes/bookmarks
  participant S as bookmark-service
  participant V as lib/validate-url + url-normalize
  participant F as title-fetch (injected lookup/request/clock)
  participant D as data/bookmark-repository

  U->>W: Activate "Save bookmark"
  W->>W: saving.set(true) - submit disabled (AC14)
  W->>R: POST /api/bookmarks { url, title? }
  R->>S: create({ url, title })
  S->>V: validateUrl(raw)
  alt invalid (AC7-AC10, EC01-EC04, F01-EC1)
    V-->>S: { ok:false, message }
    S-->>R: AppError INVALID_URL field=url
    R-->>W: 400 { error }
    W-->>U: Inline text, aria-invalid=true, focus to field
  else valid
    V-->>S: { ok:true, url }
    S->>V: normalizeUrl(url) - IDNA, drop fragment/default port/trailing slash (INV-02)
    S->>D: findLiveByNormalized(urlNormalized)
    alt duplicate (AC11, AC12, EC05, EC20)
      D-->>S: existing { id, title, url }
      S-->>R: AppError DUPLICATE_URL existingId + details
      R-->>W: 409 { error }
      W-->>U: Banner role=alert + View existing / Edit existing
    else new
      alt user title supplied
        S->>S: title_source = 'user' - fetcher NOT called (AC2)
      else title empty
        W-->>U: note "Fetching title..." aria-busy
        S->>F: fetchTitle(url) - one 5 s total budget (AC6)
        F->>F: resolve; isBlockedAddress? refuse before any socket (AC13, EC09)
        F->>F: connect to the validated address via injected lookup
        F->>F: text/html only; 512 KB cap; stop after </title> (EC08)
        F->>F: manual redirects, max 3, re-check every hop (F01-EC5)
        alt title extracted and non-empty
          F-->>S: { ok:true, title } -> title_source = 'fetched' (AC4)
        else refused / timeout / non-HTML / 4xx-5xx / loop / empty title
          F-->>S: { ok:false, reason }
          S->>S: title = hostname minus leading "www." -> 'hostname' (AC5, F01-EC3, INV-06)
        end
      end
      S->>D: BEGIN; INSERT bookmark; COMMIT (EC19)
      alt SQLITE_CONSTRAINT_UNIQUE on ux_bookmark_url_live (LD-02, AC14)
        D->>D: re-read the live row by url_normalized
        D-->>S: AppError DUPLICATE_URL - identical body
        R-->>W: 409 { error }
      else inserted
        D-->>S: bookmark row
        S-->>R: { bookmark }
        R-->>W: 201 { bookmark }
        W->>W: saving.set(false)
        alt title_source = 'hostname'
          W-->>U: toast "Couldn't fetch the title, so we used the domain instead. You can edit it anytime." (AC5)
        end
        W-->>U: Dialog closes; toast "Bookmark saved" in aria-live region (AC3)
      end
    end
  end
```

## 11. Test Hooks

Seams the build must provide so `/test-phase` can observe outcomes rather than assume them. These are design obligations on the production code, not tests themselves.

- **`createTitleFetcher({ lookup, request, clock })`** (LD-01). The injected `lookup` is the DNS harness: it makes F01-AC13 ("no TCP connection is opened") observable by asserting that `request` was never called, makes F01-EC5 testable by returning a public address on hop 1 and a private one on hop 2, and makes the DNS-rebinding shape reachable by returning different addresses on successive calls. The injected `clock` makes the AC6 budget assertable without a 5 s test.
- **One real-loopback integration test** — the only F01 test that opens a socket. It starts an HTTP server on `127.0.0.1`, points the **real** fetcher at it with the guard's loopback rule disabled for that test only, and asserts a title is extracted. This is the check that keeps the fake `request` honest (the LD-01 trade-off). It must be visibly distinct from the probe tests so nobody mistakes it for a guard bypass in review.
- **`isBlockedAddress(ip, family)`** — pure and exported, so the IPv4 and IPv6 range table is exhaustively table-tested without any I/O, including the boundary addresses of each range.
- **`createDb({ file })`** — accepts `:memory:`, so service and repository tests run against a real SQLite engine with the real schema and the real constraints, with no file and no cleanup. The LD-02 constraint path needs a genuine unique index, which a stub repository could not provide.
- **Injectable `now()`** in the bookmark service, so F01-AC1's "`created_at` and `updated_at` set to the same ISO-8601 UTC instant" is asserted deterministically.
- **`validateUrl` and `normalizeUrl` exported as pure functions** — the §7.1 message table and the §7.2 literal table become straightforward table tests, and F06 reuses both the functions and the tests.
- **Ordering assertion** — a test proves the scheme and dot checks run *before* normalization (the LD-04 trade-off), for example by asserting that `javascript:alert(1)` is rejected with the exact rule-4 message and that `normalizeUrl` was never reached.
- **`ApiService` provided through Angular DI** — component tests use `provideHttpClientTesting`, so the dialog's 400/409/201 branches and the submit-disable behavior are testable without a server.
- **Restart check for F01-AC15** is a manual, recorded procedure in `/test-phase`: save three synthetic bookmarks, stop the process, start it again, call `GET /api/bookmarks`, compare `id`, `url`, `title`, `title_source` and `created_at`. It is manual because it crosses a process boundary; Q1 permits a documented manual check where automation is impractical.
- **Deliberately not automated in F01:** EC19 (restart mid-write) and the DNS-rebinding half of F01-EC2. `spec.md` §3 already carries both to `/test-phase` as fault-injection items with a stated reason. The `createTitleFetcher` seam is what makes the second one reachable when it is written.

## 12. Architecture Impact

**One amendment, applied, since this design was first written.** `hld.md` v2 and `component-map.json` v1 are unchanged. `data-model.md` and `er-diagram.md` moved from v2 to **v3** on 2026-10-01 via **AMD-002**, which reworded INV-02's trailing-slash rule to match F01-AC12 and the code already shipped in `url-normalize.js` (§2 LD-04 above records the same change). No entity, field, index or invariant beyond that one clause changed.

Two further items were raised rather than resolved silently, because resolving either one on the agent's own authority would be the drift E3 exists to prevent. Both are settled; none is open.

| Item | Status |
|---|---|
| **The `[::1]` reading in F01-AC13** (§7.2) | **Resolved at the design gate, 2026-10-01.** `spec.md` F01-AC13 lists `[::1]` and an IPv4-mapped IPv6 form among addresses that yield **201**, while F01-EC2 says IP literals are accepted by the dot rule "only where a dot is literally present" — and `[::1]` contains none. dev-1 confirmed that AC13's list is of **resolved addresses**, not literal submissions, so both statements hold and §7.2's table satisfies both. The alternative — widening INV-01 to admit bracketed IPv6 literals, which would have contradicted `data-model.md` and required a new amendment — was rejected. INV-01 is unchanged. A one-line `/clarify` REVISE of AC13's wording remains available if the ambiguity resurfaces downstream |
| **The INV-02 trailing-slash wording** (§2 LD-04) | **Resolved 2026-10-01 via AMD-002, applied.** This section originally said the trailing `/` is dropped "when the path is exactly `/`", which made the approved F01-AC12 unsatisfiable. dev-1 ruled for the broad reading at the F01 Build gate; `data-model.md` INV-02 was amended to match on the same day. No code changed — `url-normalize.js` already implemented the broad rule |
| **Trailing-dot hostnames** (`http://example.com./`) | **Still open, deliberately.** Discovered while writing §7.2. The WHATWG parser preserves the trailing dot, and INV-02 does not mention stripping it, so `https://example.com/a` and `https://example.com./a` normalize differently and would be stored as two bookmarks despite being the same host. This is a duplicate-detection gap of the same family as F01-RK1, and it is **not** fixed here: stripping it would extend INV-02 again, and unlike the trailing-slash fix it would change what `normalizeUrl` outputs for inputs it already handles — a genuine migration question, deliberately kept separate from AMD-002. Recorded so `/test-phase F01-add-bookmark` probes it deliberately and `/review-phase` sees a known, declared gap rather than an oversight. If it is judged material, it becomes its own amendment |

## 13. Constitution Check

| Clause | Status | Note |
|---|---|---|
| P1 Specification before code | pass | `spec.md` approved 2026-10-01; this LLD precedes every line of code. `app/` does not exist yet |
| P2 Human approval gates | pass | LD-01…LD-04 and Q5 were each put to dev-1 as option tables and answered "Accept Recommendation" on 2026-10-01. The `[::1]` reading was put as the single blocking question and confirmed by dev-1 at the gate the same day. **Design gate approved 2026-10-01** |
| P3 Honesty over polish | pass | No command has been run and nothing is claimed as verified. §7.2's IPv4-expansion table is labelled design intent; the trailing-dot gap is declared open rather than quietly fixed; F01-AC6 and F01-AC13 state what `/test-phase` must observe |
| P4 Simplicity first | pass | Zero dependencies added beyond `technology.md` §5. No background job (AD-03), no ORM, no migration framework, no tag input, no pagination. LD-03 option C and LD-01 option C were rejected on exactly this ground |
| P5 Incremental delivery | pass | All twelve tasks leave the app buildable and runnable; LD-03 exists so the declared smoke contract passes from T01 onward rather than from F03 |
| P6 Single source of truth | pass | `validateUrl` and `normalizeUrl` are written once and reused by F06 through HLD §6.3. No architecture fact is restated here as an independent claim; each is cited |
| P7 Measurable requirements | pass | §4 and §7 give every AC an observable outcome: an HTTP status plus error code, an exact string, or a stored column value |
| Q1 Every AC testable | pass | §11 names the seam for each; the restart check (AC15) is a documented manual procedure, which Q1 permits |
| Q2 Tests executed | n/a | No test has been run. Nothing in this document records a result |
| Q3 Zero lint/build errors | pass (planned) | ESLint and Prettier configured in T01; each task ends with the build-verify loop |
| Q4 ≥80% coverage on business logic | pass (planned) | The measured layer is `api/src/services` plus `api/src/lib` (HLD §5). LD-01's factory keeps the fetcher inside it rather than behind an unmeasurable mock |
| Q5 No open Critical/High findings | n/a | No review has run |
| Q6 Measured NFR verification | pass | NFR-05's 5 s budget is measured in `/test-phase` against a deliberately unresponsive endpoint. NFR-01 is explicitly **not** claimed by F01 (`spec.md` §4) |
| S1 Validation at the boundary | pass | §7 places every rule in `api`; the client repeats checks for feedback only. Rule 6 and the request-shape control in §9 cover direct API calls. Unknown body keys are never spread into the row |
| S2 SSRF-guarded fetch | pass | §9 rows 6–8: resolution-then-validation, connection to the validated address through the injected `lookup`, manual redirects re-checked per hop, 5 s budget, 512 KB cap, `text/html` only, no credentials. The dot rule removes single-label targets before the resolver runs |
| S3 Output escaping | pass | Plain-text storage plus Angular interpolation; `[innerHTML]` prohibited; `href` built only after the scheme check; CSP header in `app.js` |
| S4 Parameterized queries | pass | §5: prepared statements only, `ORDER BY` a fixed constant, the `LIMIT` an internal constant and not client-controlled |
| S5 No secrets, pinned deps | pass | No secret exists. Exact versions from `technology.md` §5, lockfile committed, audit in `/review-phase` |
| S6 Search text is data | n/a | F01 accepts no search or tag input |
| U1 Keyboard-operable, visible focus | pass | §6: native controls throughout, `<dialog>` focus trap, `Esc` returns focus to the opener, focus indicator preserved in the ported stylesheet |
| U2 Labelled controls, errors as text | pass | `<label for>` on both inputs; every message is text in an `aria-live` region referenced by `aria-describedby`; nothing is signalled by colour alone |
| U3 Empty/loading/error states | partial | F01 covers the **loading** and **error** states of the add flow and the dialog's success path. The list's empty state is F03's by `spec.md` §5 — the same partial recorded at the planning gate, unchanged |
| U4 Destructive actions | n/a | F01 has none. Delete, confirmation and undo are F07's |
| U5 Actionable errors | pass | Every §8 message says what happened and what to do next. Stack traces, SQL fragments and driver codes go to the server console only |
| U6 Approved UX reference | **deviation, declared** | Four, all written up in §6 with reasons: the HLD invalid-scheme wording (C-F01-01), no tag row until F02 (C-F01-05), the ASCII apostrophe in the fetch notice (Q5), and the fetch-failure notice rendering in the toast region without the mockup's ~1.5 s hold (C-F01-08). This is the write-up `spec.md` §8 requires, named rather than counted per C-F01-09 |
| A1 Local, no paid service | pass | One Express process on localhost plus a file. The only outbound traffic is the guarded title fetch |
| A2/A5 Persistence | pass | SQLite file at `app/api/data/tagvault.db`, WAL, one transaction per logical write, schema bootstrapped before the listener opens. No browser storage |
| A3 Runnable on Windows | pass (unverified) | Node v24.18.0 is installed. **RK06 is discovered or closed at F01-T01** — this is the project's first `npm install`, and nothing about the `better-sqlite3` prebuild is confirmed until it runs |
| A4 Component map | pass | Every file in §3 and in `tasks.md` sits under `app/api` or `app/web`, both declared in `component-map.json` v1. `app/api/public` is flagged as generated |
| D1 Synthetic data | pass | Every example is under `example.com`/`example.org`/`example.net` or an RFC-reserved address used as a probe target. `data/` is git-ignored |
| D2/D3 Licensing | pass | No dependency beyond `technology.md` §5, all MIT. Express 5-versus-4 idioms are already a review lens for copy-pasted snippets |
| E1 Evidence format | pass | `E-design-102` drafted for this run from the standard template, with the human-only fields left `TODO(human)` |
| E3 No artifact disagrees | pass, with one item declared | §12 records the trailing-dot gap rather than resolving it silently. The `[::1]` apparent disagreement and the INV-02 trailing-slash wording were both settled by amendment or gate ruling, not by a silent edit. Nothing here contradicts `hld.md` v2 or `data-model.md` v3 |

## 14. Change Log

| Date | Change | Why | Source |
|---|---|---|---|
| 2026-10-01 | Initial low-level design, draft. LD-01 (fetcher injection seam plus one loopback test), LD-02 (client disable **and** unique-constraint translation to an identical 409), LD-03 (minimal `GET /api/bookmarks` and `GET /api/tags` so the declared smoke contract passes from T01), LD-04 (WHATWG `new URL()` normalization with validation strictly before it), Q5 (ASCII apostrophe in the fetch notice, declared as a U6 deviation) — all five answered "Accept Recommendation" by dev-1 | `/design-feature F01-add-bookmark`, CREATE mode | design |
| 2026-10-01 | Two challenge outcomes recorded as design constraints rather than left implicit: `fetchTitle` never throws (a failed fetch is a 201, so an escaping exception would become a 500), and the F01 list route carries a fixed internal `LIMIT 50` | The `design-alternatives` challenge round ("what breaks at 1,000 records / on fetch failure / on restart / keyboard-only") changed both | design |
| 2026-10-01 | Recorded, not resolved: the `[::1]` reading in F01-AC13 versus the dot rule, and the trailing-dot hostname normalization gap in INV-02 | Both touch approved artifacts. Resolving either silently would be the E3 drift this framework exists to prevent. Raised at the gate | design |
| 2026-10-01 | **Status draft → approved.** dev-1 confirmed the `[::1]` reading (F01-AC13 lists *resolved* addresses, not literal submissions) and approved the design gate. §7.2, §12 and §13 updated to the settled position; INV-01 unchanged and no amendment raised for it. The trailing-dot gap stays open by choice and carries to `/test-phase` | Design gate, `/design-feature F01-add-bookmark` | design |
| 2026-10-01 | **CHANGE: §2 LD-04 and §6's AC5 justification corrected; §6 U6 table gains a fourth row; §12 and §13 updated; headers bumped to Data model v3.** LD-04 now states "drop one trailing `/` from the path, whether or not it is otherwise empty", matching `data-model.md` v3 INV-02 (AMD-002, applied) and the code already shipped in `url-normalize.js`. §6's AC5 paragraph no longer claims the mockup's two requirements "cannot both hold" — `docs/mockup.html` lines 283–290 show both are reproducible with a ~1.5 s hold — and instead records the toast-region choice as a declared U6 deviation with its real cost stated, matching `spec.md` C-F01-08. No code, task, or test changed: both corrections describe behavior the shipped code and passing tests already exhibit | `/design-feature F01-add-bookmark`, CHANGE mode, following AMD-002 (apply gate approved 2026-10-01) and `/clarify F01-add-bookmark`'s C-F01-08/C-F01-09 (spec re-approved 2026-10-01) | design |
