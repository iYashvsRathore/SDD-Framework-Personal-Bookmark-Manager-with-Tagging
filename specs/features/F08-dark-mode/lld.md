# F08: Dark Mode (Low-Level Design)

**Feature ID:** F08-dark-mode
**Status:** approved — LD-01…LD-04 accepted by dev-1 ("accept all recommendation") 2026-10-01; design gate approved 2026-10-02
**Spec version:** 1, approved 2026-10-01
**HLD version:** 4 (amended by AMD-004 during this design session)
**Data model version:** 3
**Component map version:** 1
**Components affected:** `api`, `web` — both resolved from `specs/architecture/component-map.json` v1

> Design only. No F08 code exists yet. Every "the code will…" statement is an instruction to `/build-feature`; every expected outcome is checked for the first time in `/test-phase F08-dark-mode`.

## 1. Design Overview

F08 wires the already-approved `setting` table (`data-model.md` v3, AD-05) to two new routes — `GET /api/settings/theme`, `PUT /api/settings/theme` — and a new client-side `ThemeStore`. On the `api` side this is one new repository (`setting-repository.js`), one new service (`setting-service.js`), one new route file (`settings.js`), and one addition to the shared `app-error.js` error-code map (`INVALID_THEME`, approved via **AMD-004**, applied inline during this session — see §12). No schema object changes: the `setting` table and its `CHECK` constraints already exist.

On the `web` side, F08 adds a `state/theme.store.ts` (the architecture note in `hld.md` §4 already names this file), a small inline pre-paint script in `index.html`'s `<head>` so the first frame is never the wrong theme (F08-AC2, AC3), a header toggle button reusing the existing icon-rendering convention (`icons.ts`), and a `localStorage` mirror that is a render hint only, never the source of truth (`hld.md` §6.5).

**Out of scope, unchanged from `spec.md` §5:** OS `prefers-color-scheme` detection of the *initial* default (C-F08-02); live cross-tab sync; a third theme option; per-component overrides; any new visual tokens beyond the `[data-theme=dark]` block `docs/mockup.html` already defines.

## 2. Alternatives Considered

All four decisions were presented to dev-1 as option tables on 2026-10-01; dev-1 replied "accept all recommendation." A fifth question — whether to raise an amendment for the missing `INVALID_THEME` error code — was also accepted and is recorded as AMD-004 (§12).

### LD-01 Where the theme's client-side state lives

| Option | Pros | Cons |
|---|---|---|
| **A: A new `state/theme.store.ts`** | `hld.md` §4's Project Structure already names it: "state/ signal stores: bookmarks, tags, theme" — this is already the planned shape, not a new one; keeps `BookmarksStore` untouched; independently unit-testable with `vi.useFakeTimers()`/a faked `ApiService` for the AC8 race | One more small file |
| B: Fold into `BookmarksStore` | Fewer files | Contradicts the already-declared architecture note; bloats an unrelated store; theme has nothing to do with bookmark CRUD |

**Decision:** A (dev-1, 2026-10-01, "accept all recommendation").
**Trade-off:** none of note — this is the shape the architecture already committed to.
**Challenge applied:** *at 1,000 records?* Unaffected — one theme value regardless of list size. *On restart?* This is the mechanism NFR-02/EC26 require — the `setting` row is what survives, not the store. *Keyboard-only?* N/A to this decision; covered by LD-04/§6.

### LD-02 Avoiding a flash of the wrong theme on load (F08-AC2, AC3)

| Option | Pros | Cons |
|---|---|---|
| **A: A tiny inline `<script>` in `index.html`'s `<head>`**, guarded by `try/catch` (F08-AC10), reads the `localStorage` mirror synchronously and sets `document.documentElement.dataset.theme` before any CSS paints — exactly what `hld.md` §6.5's load flow diagram already specifies ("Paint theme from `localStorage` mirror, then reconcile with `GET`") | The only way to guarantee zero flash — it runs before Angular parses, before first paint | A few lines of vanilla JS outside the Angular component tree (the only place in `web` that isn't a component) |
| B: Read `localStorage` inside `App`'s constructor / an `APP_INITIALIZER` | Everything stays inside Angular | By the time Angular bootstraps and renders, the browser may already have painted the default `light` state for at least one frame — violates AC2/AC3's explicit "not flash the other one first" |

**Decision:** A (dev-1, 2026-10-01, "accept all recommendation").
**Trade-off:** one small non-Angular script, accepted because it is the only option that actually satisfies AC2/AC3, and it is what the HLD flow diagram already implies.
**Challenge applied:** *at 1,000 records?* N/A — runs once per page load, independent of list size. *On restart?* This IS the restart case (F08-AC5/EC26): the mirror paints instantly, then `ThemeStore.load()` reconciles with the server value, which is authoritative. *Keyboard-only?* N/A to this decision.

### LD-03 Handling the rapid-toggle race (F08-AC8)

| Option | Pros | Cons |
|---|---|---|
| **A: Monotonic request token on `ThemeStore`** — every `load()`/`toggle()` call increments a counter; a response is applied to state only if its token is still the latest, exactly the `tagSuggestionsRequestToken` idiom already used in `bookmarks.store.ts` | Reuses a proven, already-tested pattern in this codebase; also protects the initial `GET` reconciliation from overwriting a toggle the user fires before it resolves, closing an edge AC8 does not name but the same mechanism closes for free | None beyond the one counter field |
| B: `AbortController` cancelling the previous in-flight request | Standard web API | Aborting an already-sent HTTP request does not un-send it or guarantee server-side ordering — only governs whether the *client* reads the response; same outcome as A, via a pattern not otherwise used in this codebase |

**Decision:** A (dev-1, 2026-10-01, "accept all recommendation").
**Trade-off:** none beyond the one counter field, accepted because it is the proven idiom already in `bookmarks.store.ts`. Server-side: `PUT`s are a single-value upsert processed synchronously by `better-sqlite3` in arrival order on one connection, so no additional server-side sequencing is built (P4) — the stored value always reflects whichever `PUT` the server received last, and the token guard is what keeps the UI from later overwriting that with a stale response.
**Challenge applied:** *at 1,000 records?* N/A — one row, one key. *On restart?* N/A — the race is between two in-flight client requests, not across a restart. *Keyboard-only?* F08-AC8's toggle can be activated twice in rapid succession via `Enter`/`Space` exactly as by click; the guard applies identically either way.

### LD-04 Icon rendering for the toggle (moon ⇄ sun)

| Option | Pros | Cons |
|---|---|---|
| **A: Convert the mockup's `sun` circle+rays into one `d` string, same technique already used for `search`** (whose mockup `<circle>` was converted into two arcs) — keep one `d` string per icon, no change to the shared icon-rendering template | Zero change to the rendering template or convention; `moon` is already a single `<path>` in the mockup, so only `sun` needs conversion | Slightly fiddlier path math (mechanical, not a design judgment call) |
| B: Extend the icon-rendering template to accept a second shape (e.g. an optional `<circle>`) | Matches the mockup's literal markup exactly | New capability added to the shared template for exactly one icon, when option A's precedent (`search`) already proves the single-`d`-string approach works |

**Decision:** A (dev-1, 2026-10-01, "accept all recommendation").
**Trade-off:** none of note — reuses the existing single-`d`-string convention and precedent.
**Challenge applied:** *at 1,000 records?* N/A. *On restart?* N/A. *Keyboard-only?* N/A to this decision; the icon is `aria-hidden`, exactly like every other icon in `icons.ts` — the accessible name comes from the button's `aria-label`, covered in §6.

## 3. Component Changes

Paths resolved through `specs/architecture/component-map.json` v1: `api` → `app/api`, `web` → `app/web` (both `workspaceRoot: "."`).

| Component id | Resolved path | File (new/changed) | Responsibility |
|---|---|---|---|
| `api` | `app/api` | `src/lib/app-error.js` (changed) | Adds `INVALID_THEME: 400` to `STATUS_BY_CODE` and a new `invalidThemeError()` constructor — the ONE place this 400 body is built (P6), mirroring `duplicateUrlError()`'s shape |
| `api` | `app/api` | `src/data/setting-repository.js` (new) | Two prepared statements: `get(key)` (`SELECT value FROM setting WHERE key = ?`) and `upsert(key, value, updatedAt)` (`INSERT … ON CONFLICT(key) DO UPDATE`) |
| `api` | `app/api` | `src/services/setting-service.js` (new) | `getTheme()` — returns the stored value or the server-side default `'light'` without writing a row (F08-AC1, F08-EC1); `setTheme(value)` — validates the two-value allow-list, throws `invalidThemeError()` on anything else (F08-AC6, F08-EC2), else upserts and returns the stored value |
| `api` | `app/api` | `src/routes/settings.js` (new) | `GET /settings/theme` → `{ theme }`; `PUT /settings/theme` → `{ theme }` or the mapped error. HTTP only (hld.md §5) — no business rule, no SQL |
| `api` | `app/api` | `src/app.js` (changed) | Constructs `settingRepository`/`settingService` alongside the existing repositories/services; mounts `createSettingsRouter({ service: settingService })` |
| `api` | `app/api` | `test/setting-repository.test.js` (new) | Vitest specs for `get`/`upsert` — F08-AC1, AC4 |
| `api` | `app/api` | `test/setting-service.test.js` (new) | Vitest specs for `getTheme`/`setTheme` — F08-AC1, AC4, AC6, F08-EC1, EC2 |
| `api` | `app/api` | `test/settings-route.test.js` (new) | Vitest + supertest-style specs (matching the existing route-test pattern) for both routes — F08-AC1, AC3, AC6 |
| `web` | `app/web` | `src/index.html` (changed) | Adds the inline pre-paint `<script>` in `<head>` (LD-02, F08-AC2, AC3) |
| `web` | `app/web` | `src/app/core/models.ts` (changed) | Adds `export type Theme = 'light' | 'dark';` and `export interface ThemeResponse { readonly theme: Theme }` |
| `web` | `app/web` | `src/app/core/api.service.ts` (changed) | Adds `getTheme(): Promise<ThemeResponse>` and `setTheme(theme: Theme): Promise<ThemeResponse>` |
| `web` | `app/web` | `src/app/core/icons.ts` (changed) | Adds `moon` and `sun` path strings (LD-04), ported from `docs/mockup.html`'s `P` object |
| `web` | `app/web` | `src/app/state/theme.store.ts` (new) | `theme` signal, `load()` (reconciles with the server on startup, F08-AC9 fallback), `toggle()` (optimistic flip + `PUT` + request-token guard, LD-03), the `localStorage` mirror read/write (both wrapped in `try/catch`, F08-AC10) |
| `web` | `app/web` | `src/app/app.html` (changed) | Adds the header toggle `<button>` next to the existing "Add bookmark" button, state-aware `aria-label`/`aria-pressed` bound to `ThemeStore` |
| `web` | `app/web` | `src/app/app.ts` (changed) | Injects `ThemeStore`; calls `theme.load()` in the constructor alongside the existing `store.loadList()`; exposes `protected readonly theme = inject(ThemeStore);` for the template |
| `web` | `app/web` | `src/app/state/theme.store.spec.ts` (new) | Vitest specs — see §11 |

## 4. API / Interface Contract

Error bodies use the shape fixed in `hld.md` §8 (`{ error: { code, message, field? } }`), unchanged by F08. The `INVALID_THEME` row was added to that table by **AMD-004** (§12).

| Method | Route / function | Input | Success response | Error responses |
|---|---|---|---|---|
| `GET` | `/api/settings/theme` | none | **200** `{ "theme": "light" \| "dark" }` — a missing row returns `"light"` without creating one (F08-AC1, F08-EC1) | *(none — this route never errors; a database failure is the one case translated to the existing `STORAGE_ERROR` 500 by the shared error middleware, unchanged, not a new F08 case)* |
| `PUT` | `/api/settings/theme` | `{ "theme": "light" \| "dark" }` | **200** `{ "theme": "light" \| "dark" }` — the value just stored (F08-AC3) | `400 { error: { code: 'INVALID_THEME', message: 'Theme must be "light" or "dark".', field: 'theme' } }` — missing, empty, or any value outside the two-value allow-list (F08-AC6, F08-EC2) |
| function | `setting-service.getTheme()` → `string` | none | `'light'` or `'dark'` | never throws |
| function | `setting-service.setTheme(value)` → `string` | the raw `payload.theme`, any shape | the stored value | throws `invalidThemeError()` on anything other than the two literal strings |
| function | `setting-repository.get(key)` → `string \| null` | `'theme'` | the stored `value` or `null` | never throws |
| function | `setting-repository.upsert(key, value, updatedAt)` → `void` | `'theme'`, the validated value, an ISO-8601 timestamp | writes or updates the one row | never throws |
| method | `ApiService.getTheme()` → `Promise<ThemeResponse>` | none | the parsed `{ theme }` body | rejects, mapped by the existing `api-error.ts` |
| method | `ApiService.setTheme(theme)` → `Promise<ThemeResponse>` | `'light' \| 'dark'` | the parsed `{ theme }` body | rejects, mapped the same way |

**Every acceptance criterion is reachable from this table or from §6:** AC1 via `GET`'s success row; AC2/AC3 via §6's load/toggle states; AC4 via §5's upsert description; AC5 via AC1's default-plus-persistence combination; AC6 via the error row; AC7 via §6's keyboard notes; AC8 via §6's race-guard note; AC9/AC10 via §6's fallback and degraded-mode notes.

## 5. Data Access

**No entity, field, index, or invariant is added, changed, or removed.** The `setting` table, its `CHECK` constraints, and `INV-11` already exist in `data-model.md` v3 (AD-05).

| Entity | F08 use |
|---|---|
| `setting` | Read (`GET`) and write (`PUT`) the one row with `key = 'theme'`. No other key is ever touched — `INV-11`'s allow-list already restricts `key` to `{'theme'}` at the schema level |

**Queries** — prepared statements only (S4); no value is ever concatenated into SQL.

| Function | Statement (described) |
|---|---|
| `get(key)` | `SELECT value FROM setting WHERE key = ?` — bound `key`; returns `null` when no row exists (F08-AC1, F08-EC1 — the read itself never inserts a row) |
| `upsert(key, value, updatedAt)` | `INSERT INTO setting (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at` — all three values bound; updates the row in place rather than ever producing a second row (F08-AC4) |

**Service orchestration:**

- `getTheme()`: `repository.get('theme')` → `null` returns the constant default `'light'` (never written); a stored value is returned as-is.
- `setTheme(value)`: `value !== 'light' && value !== 'dark'` throws `invalidThemeError()` before any repository call (S1) → `repository.upsert('theme', value, now())` → returns `value`.

## 6. UI Changes and States

Ported from `docs/mockup.html` (U6): the toggle button `#th` (`class="btn sq"`, `aria-label`, `aria-pressed`) and its `moon`/`sun` icon swap.

| View/component | Loading | Empty | Error | Success | Accessibility notes |
|---|---|---|---|---|---|
| **Pre-paint (before Angular bootstraps)** | n/a | n/a | `localStorage` read throws or is unavailable (F08-AC10) — the inline script's `try/catch` falls through to `'light'`, same as a first-ever visit | The mirror value (if present and valid) sets `document.documentElement.dataset.theme` synchronously, before first paint (F08-AC2, AC3) | n/a — no visible control yet |
| **`ThemeStore.load()` (on app init)** | No spinner — the pre-paint script has already rendered a theme; this is a silent reconciliation, not a visible loading state | n/a | `GET` fails (network error or non-2xx, F08-AC9/F08-EC4) — the store keeps whatever the pre-paint script set (the `localStorage` mirror, or `'light'` if none), and the app renders normally; no blocking error screen | The server's value overwrites the pre-paint guess if different, updating `<html data-theme>` and the toggle's `aria-pressed`/label; this is the only authoritative source (F08-AC5, EC26) | n/a — no user-facing control during this step |
| **Header theme toggle (`<button aria-pressed>`)** | n/a — the flip is optimistic, not awaited (F08-AC3) | n/a | `PUT` fails after an optimistic flip — the flipped value stands (the user's intent is honored visually); the request-token guard (LD-03) only prevents a *stale* response from overwriting a *newer* toggle, it does not roll back a failed one, since no AC asks for a rollback and doing so would itself be a flash the user did not cause | Activating the toggle flips `<html data-theme>` immediately, switches `aria-pressed` (`"false"` ⇄ `"true"`) and the accessible label (`Dark mode` ⇄ `Light mode`, C-F08-04), and writes the `localStorage` mirror (best-effort, F08-AC10); the `PUT` request fires in parallel (F08-AC3) | Native `<button>`, reachable by `Tab`, with the existing `:focus-visible` outline (F08-AC7). State conveyed through `aria-pressed`, not colour alone (NFR-03). `Enter`/`Space` activate it exactly as a click would — the platform's native button behavior, no custom key handling needed |

**Destructive action (U4):** not applicable — toggling a theme is reversible with one more click; no confirmation or undo is warranted.

### U6 deviation — declared, with reason

| Deviation | Reason |
|---|---|
| The toggle's accessible label is state-aware (`Dark mode` when light-mode-is-active / `Light mode` when dark-mode-is-active) rather than the mockup's static `aria-label="Dark mode"`. | C-F08-04 (clarified 2026-10-01): a static label is ambiguous about which state activating the button leads to once the theme has already changed once; the state-aware label names the action the next click performs, matching the same precedent as F07's toast-duration deviation. |

## 7. Validation Rules

| Field | Rule | User message |
|---|---|---|
| `theme` (`PUT` body) | Must be exactly `'light'` or `'dark'`; any other value, an empty string, or a missing field is rejected | `Theme must be "light" or "dark".` (F08-AC6) |

## 8. Error Handling

| Condition | Detected where | Response / UI feedback |
|---|---|---|
| `PUT` body's `theme` is missing, empty, or not in `{'light','dark'}` (F08-AC6, F08-EC2) | `setting-service.setTheme()`, before any repository call | `400 INVALID_THEME`, exact message above; the stored row (if any) is left unchanged, since the rejection happens before the upsert runs |
| No `setting` row exists yet (F08-AC1, F08-EC1) | `setting-service.getTheme()`'s `null` branch | `200 { theme: 'light' }`; the read never writes a row |
| `GET /api/settings/theme` fails outright on page load — network error or non-2xx (F08-AC9, F08-EC4) | `ThemeStore.load()`'s promise rejection | The app renders anyway, keeping whatever the pre-paint script already set (the `localStorage` mirror, or `'light'`); no blocking error screen, no toast — this is a silent, non-fatal fallback, consistent with "no AC asks for a visible error here" |
| `localStorage` is unavailable or throws on write (F08-AC10, F08-EC5) | Both the inline pre-paint script and `ThemeStore.toggle()`'s mirror write, each independently wrapped in `try/catch` | The theme still switches visually and the `PUT` still succeeds; only the first-paint mirror optimization is lost, never the feature itself |
| The toggle is activated twice in rapid succession before the first `PUT` resolves (F08-AC8, F08-EC3) | `ThemeStore.toggle()`'s monotonic request token (LD-03) | The final displayed state and the final stored value both match the **last** toggle; an out-of-order response whose token is stale is discarded on arrival, never applied |

## 9. Security Considerations

One row per untrusted input F08 touches, per the `secure-input-handling` skill.

| Untrusted input | Control applied | Constitution clause |
|---|---|---|
| `PUT` body's `theme` value | Validated against a two-value allow-list in the **service**, before any repository call (S1); bound as a parameter in the upsert (S4); the `setting.value` `CHECK` restriction (data-model.md v3, AD-05) is a second, data-level line of defence | **S1**, S4 |
| `setting.key` | Never accepted from the request — both routes operate on the literal constant `'theme'`, never a path or body-supplied key, so `INV-11`'s allow-list is enforced twice over (by never being reachable, and by the `CHECK` if it ever were) | **S1** |

**Not applicable in F08:** search text, tag values, URLs, `page`/`size` — F08 introduces no new surface for any of these.

## 10. Sequence

```mermaid
sequenceDiagram
  actor U as User
  participant H as index.html inline script
  participant W as web (App + ThemeStore)
  participant R as api routes/settings
  participant S as setting-service
  participant D as data/setting-repository

  Note over H: Page load, before Angular bootstraps
  H->>H: try: read localStorage mirror
  alt mirror present and valid
    H->>H: set <html data-theme> from mirror (F08-AC2 unaffected, F08-AC5 common case)
  else absent or throws (F08-AC10)
    H->>H: leave <html data-theme="light"> (F08-AC2, fresh visit)
  end

  W->>W: ThemeStore.load() — bump request token
  W->>R: GET /api/settings/theme
  R->>S: getTheme()
  S->>D: get('theme')
  alt no row (F08-EC1)
    D-->>S: null
    S-->>R: 'light'
  else stored
    D-->>S: value
    S-->>R: value
  end
  alt GET failed (F08-AC9, F08-EC4)
    R--xW: network error / non-2xx
    W-->>U: keep pre-paint value, render normally, no error UI
  else GET succeeded, token still current
    R-->>W: 200 { theme }
    W->>W: set <html data-theme>, update toggle aria-pressed/label
  end

  U->>W: Activate header toggle
  W->>W: bump request token; flip <html data-theme> optimistically (F08-AC3)
  W->>W: try: write localStorage mirror (F08-AC10)
  W->>R: PUT /api/settings/theme { theme }
  R->>S: setTheme(theme)
  alt invalid value (F08-AC6, F08-EC2)
    S-->>R: AppError INVALID_THEME
    R-->>W: 400
  else valid
    S->>D: upsert('theme', value, now)
    D-->>S: ok
    S-->>R: value
    R-->>W: 200 { theme }
  end
  W->>W: apply only if this response's token is still the latest (F08-AC8, LD-03)
```

## 11. Test Hooks

- **`setting-service.getTheme()` / `setTheme(value)`** are exported as plain functions accepting the raw, possibly-invalid `value` the route passes through, so their tests call them exactly as the route does, without a running server — matching the existing pattern for `tag-service.normalizeAndValidate`.
- **`setting-repository.get` / `upsert`** are exported directly, so a repository-level test can assert the no-row default, the single-row upsert-in-place behavior (F08-AC4), and the `updated_at` advance, using the existing `createDb({ file: ':memory:' })` harness.
- **`invalidThemeError()`** in `app-error.js` is exported and directly assertable, so a test can confirm its exact message and field.
- **`ThemeStore.load()` / `toggle()` / the request-token guard`** are testable against a faked `ApiService` (the same `provideHttpClientTesting()` pattern F01/F03/F06/F07 already use), asserting: `load()`'s fallback on a rejected `GET` (F08-AC9); `toggle()`'s optimistic flip ahead of the `PUT` resolving (F08-AC3); and that firing `toggle()` twice before either `PUT` resolves leaves the final state matching the last call, with the first (now-stale) response's token causing it to be discarded (F08-AC8).
- **The `localStorage` mirror read/write** are testable by stubbing `window.localStorage` to throw, asserting both the inline script and `ThemeStore` degrade without throwing an uncaught error (F08-AC10, F08-EC5).
- **Deliberately not automated here, carried to `/test-phase F08-dark-mode`** per `spec.md` §6: the F08-AC5/EC26 restart check (set the theme, stop and restart the process, load in a fresh session with no `localStorage` mirror, confirm the server value is returned and rendered) remains a documented manual/measured procedure, the same pattern F01's and F07's own restart ACs already use.

## 12. Architecture Impact

**AMD-004, applied inline during this design session.** `hld.md` v3 §8's error-handling table did not include `INVALID_THEME`, which `spec.md` C-F08-03/F08-AC6 already commits this feature to returning — the same gap AMD-003 closed for `EDIT_CONFLICT`. dev-1 approved raising and applying the amendment immediately, following the AMD-001/002/003 precedent (apply inline during feature design rather than a separate `/amend-architecture` invocation).

**What changed:** one row inserted into `hld.md` §8 (`INVALID_THEME | 400 | 'Theme must be "light" or "dark".' | F08-AC6, F08-EC2`); `hld.md` bumped to **v4**; its Status line now lists AMD-004. No schema object, entity, field, index, or component path changed — `data-model.md` (still v3), `er-diagram.md` (still v3), and `component-map.json` (still v1) are all unaffected, since `setting.value`'s `CHECK` restriction (AD-05) already covered the data-level invariant.

Full record: `specs/architecture/amendments/AMD-004-invalid-theme-error-code.md`.

No other architecture impact. `hld.md` §6.5 already specifies the full theme flow (authoritative `setting` row, non-authoritative `localStorage` mirror) this LLD implements; `data-model.md` v3's `setting` table, its `CHECK` constraints, and `INV-11` already exist for this exact purpose.

## 13. Constitution Check

| Clause | Status | Note |
|---|---|---|
| P1 Specification before code | pass | `spec.md` approved 2026-10-01; no F08 code exists yet |
| P2 Human approval gates | pass | LD-01…LD-04 and the AMD-004 question each put to dev-1 as option tables; all answered "accept all recommendation" 2026-10-01 |
| P3 Honesty over polish | pass | Nothing here is claimed as verified; `/test-phase F08-dark-mode` is where F08-AC5/EC26's restart check is actually run |
| P4 Simplicity first | pass | No new table, column, or index — reuses `data-model.md` v3's existing `setting` table verbatim (AD-05). No background job, no polling, no third theme option (spec.md §5) |
| P5 Incremental delivery | pass | Every task in `tasks.md` leaves the app buildable and runnable |
| P6 Single source of truth | pass | `invalidThemeError()` is the one function that constructs the 400 body, the same discipline `duplicateUrlError()`/`editConflictError()`/`restoreDuplicateUrlError()` already establish |
| P7 Measurable requirements | pass | §4/§7/§8 give every AC an observable outcome: an HTTP status and JSON shape, an exact UI string, an `aria-pressed` value, or a stored column value |
| Q1 Every AC testable | pass | §11 names the seam for each; F08-EC1…EC5 all map to a named test hook or to §8's handling |
| Q2 Tests executed | n/a | No test has run yet |
| Q3 Zero lint/build errors | pass (planned) | Each task ends with the build-verify loop |
| Q4 ≥80% coverage on business logic | pass (planned) | The measured layer is `api/src/services` plus `api/src/lib` (unchanged scope from F01/F03/F06/F07) |
| Q5 No open Critical/High findings | n/a | No review has run |
| Q6 Measured NFR verification | n/a | F08 claims no new NFR measurement beyond NFR-02's existing restart check, measured in `/test-phase`, never estimated |
| S1 Validation at the boundary | pass | `theme` is validated in the service against a closed allow-list, before any repository call; `setting.key` is never request-supplied |
| S4 Parameterized queries | pass | §5: every value a bound parameter; no value is ever concatenated into SQL text |
| S3 Output escaping | n/a | F08 renders no user- or server-supplied free text; `theme` is one of two literal constants, bound directly to a `data-*` attribute and an `aria-pressed` boolean, never interpolated as markup |
| U1 Keyboard-operable, visible focus | pass | §6, §11: a native `<button>`; the existing `:focus-visible` outline applies unchanged (F08-AC7) |
| U2 Labelled controls, errors as text | pass | The toggle carries a real, state-aware `aria-label`; its pressed state is `aria-pressed`, not colour alone (NFR-03) |
| U3 Empty/loading/error states | pass | F08-AC9's fallback is the one state this feature adds, and it is non-blocking by design — no new visible error UI, since no AC asks for one |
| U4 Destructive actions require confirmation or offer undo | n/a | Toggling a theme is not destructive — reversible with one more click |
| U5 Actionable errors | pass | The one error this feature can surface (`INVALID_THEME`) states exactly what value is required |
| U6 Approved UX reference | pass, one declared deviation | §6's U6 deviation table: the state-aware accessible label (C-F08-04), the only point of departure from `docs/mockup.html`'s static label |
| D1 Synthetic data | pass | No example in this document uses anything but the two literal theme values |
| A2/A5 Persistence | pass | F08-AC5/EC26 are a real stop/restart check against the existing SQLite file; no new persistence mechanism introduced |
| A4 Component map | pass | Every file in §3 and `tasks.md` sits under `app/api` or `app/web`, both declared in `component-map.json` v1 |
| E1 Evidence | pass | Material interactions from this session are logged per the `evidence-logging` skill |
| E3 No artifact disagrees | pass | §12 resolves the one gap (the missing `INVALID_THEME` row) through AMD-004, applied before this LLD was finalized — nothing here contradicts `hld.md` v4, `data-model.md` v3, or `component-map.json` v1 |

## 14. Change Log

| Date | Change | Why | Source |
|---|---|---|---|
| 2026-10-01 | Initial low-level design, draft. LD-01 (new `theme.store.ts`), LD-02 (inline pre-paint script in `index.html`), LD-03 (monotonic request token, mirroring `bookmarks.store.ts`'s existing idiom), LD-04 (single-`d`-string sun icon, mirroring the `search` icon's precedent) — all four answered "accept all recommendation" by dev-1. AMD-004 raised and applied inline (`INVALID_THEME` added to `hld.md` §8, now v4) | `/design-feature F08-dark-mode`, CREATE mode | design |
