# F08: Dark Mode (Spec)

**Feature ID:** F08-dark-mode
**Owner:** dev-1
**Status:** approved
**Approved:** 2026-10-01 by dev-1
**Requirements covered:** R12 (full — "Human decision, 2026-09-30 — not stated in the assignment source")
**Components affected:** `api`, `web`
**Depends on:** F03
**Constitution version:** 1.0.0

## 1. User Stories

- **F08-US1:** As Priya, I want to switch between a light and a dark appearance from the header, so that I can read the app comfortably in whatever lighting I'm in.
- **F08-US2:** As Priya, I want my appearance choice to still be in effect after I stop and restart the app, so that I don't have to re-select it every time I come back.
- **F08-US3:** As Priya, I want the page to load already showing my chosen appearance, not flash the other one first, so that the switch feels deliberate rather than broken.

## 2. Acceptance Criteria (testable)

| AC ID | Given | When | Then |
|---|---|---|---|
| F08-AC1 | No `setting` row for `theme` exists yet (a fresh database) | `GET /api/settings/theme` is called | **200** with `{ "theme": "light" }` — never 404 or 500; no row is created by the read itself |
| F08-AC2 | The application is loaded in a browser with no prior visit (no `localStorage` mirror) | The page first paints | The page renders with the `light` appearance (`<html data-theme="light">`); the header toggle shows `aria-pressed="false"` and the label `Dark mode`; **no OS `prefers-color-scheme` detection is used to choose the initial value** |
| F08-AC3 | The app is showing the `light` appearance | I activate the header toggle | `PUT /api/settings/theme` is called with `{ "theme": "dark" }`; it returns **200** with the updated value; `<html data-theme>` switches to `dark` immediately (optimistically, not waiting for the response); the toggle's `aria-pressed` becomes `"true"` and its accessible label changes to `Light mode`; a mirror value is written to `localStorage` for next load's first paint only |
| F08-AC4 | The theme was set to `dark` in F08-AC3 | The `setting` table is inspected directly | Exactly one row exists with `key='theme'`, `value='dark'`, and `updated_at` advanced to the write's timestamp — the row is updated in place (`UPSERT`/`INSERT ... ON CONFLICT`), never a second row |
| F08-AC5 | The theme was set to `dark` (F08-AC3) | The application process is stopped and started again, then the page is loaded in a fresh browser session with no `localStorage` mirror | `GET /api/settings/theme` returns `{ "theme": "dark" }`; the page renders the `dark` appearance (EC26) |
| F08-AC6 | No UI is involved | `PUT /api/settings/theme` is called directly with `{ "theme": "blue" }`, `{ "theme": "" }`, or a body missing the `theme` field | **400** with `error.code='INVALID_THEME'` and `error.field='theme'`; the inline/announced message reads exactly `Theme must be "light" or "dark".`; the stored `setting` row (if any) is unchanged |
| F08-AC7 | The header toggle is reachable | I operate it using only the keyboard | `Tab` reaches the toggle with a visible focus indicator; `Enter` or `Space` activates it exactly as a click would; its pressed state is conveyed through `aria-pressed`, not colour alone (NFR-03) |
| F08-AC8 | The toggle is activated twice in rapid succession (light→dark, then dark→light before the first response returns) | Both requests are processed by the server | The final stored `value` matches the **last** toggle the user performed, not an earlier in-flight request that resolves out of order; the UI reflects the same final state, never flickering back to a stale value after both responses settle |
| F08-AC9 | `GET /api/settings/theme` fails (network error or non-2xx) on page load | The page renders anyway | The app falls back to its last-known `localStorage` mirror if present, or `light` if not; **the page is still usable** — no blocking error screen is shown for a theme-read failure alone |
| F08-AC10 | `localStorage` is unavailable (for example, disabled by the browser or a private-mode restriction that throws on write) | The toggle is activated | The theme still switches visually and the `PUT` request still succeeds; only the first-paint mirror optimization is lost, not the feature itself |

### Requirement coverage

| Requirement | Covered by |
|---|---|
| R12 | F08-AC1–AC10 |

## 3. Edge Cases

| EC ID | Scenario | Expected behavior | Found by (assignment/AI/human) |
|---|---|---|---|
| EC26 | Dark-mode preference set, then the application restarted | The chosen appearance is still in effect (F08-AC5) | human |
| F08-EC1 | No `setting` row exists yet (very first run, nobody has ever toggled) | `GET` returns `200` with a server-side default of `light`; no row is created until the user actually toggles (F08-AC1) | AI |
| F08-EC2 | `PUT /api/settings/theme` is called with an invalid or missing `theme` value, bypassing the toggle's own two-value constraint | Rejected with `400 INVALID_THEME`; no row is written or changed (F08-AC6) | AI |
| F08-EC3 | The toggle is clicked twice in rapid succession, putting two `PUT` requests in flight at once | The stored value and the rendered UI both reflect the last user action, not whichever response happens to arrive first (F08-AC8) | AI |
| F08-EC4 | `GET /api/settings/theme` fails outright on page load (network error, 5xx) | The app still renders, falling back to the `localStorage` mirror or `light`; no blocking error state (F08-AC9) | AI |
| F08-EC5 | `localStorage` is unavailable or throws on write (private browsing, disabled storage) | The toggle and the server-side persistence still work; only the first-paint mirror optimization is lost (F08-AC10) | AI |

## 4. Applicable NFRs

| NFR ID | How it applies to this feature |
|---|---|
| NFR-02 | The theme preference is the one piece of `setting` state this feature owns; it must be 100% present after a stop/restart with no partial writes (F08-AC4, F08-AC5). |
| NFR-03 | The toggle must be keyboard-operable with a visible focus indicator, and its state conveyed through `aria-pressed` plus an accessible label, not colour alone (F08-AC7). |
| NFR-04 | The `PUT` body is validated at the boundary against a two-value allow-list (S1); the `setting` write is a parameterized query (S4), consistent with the schema's own `CHECK` constraint (F08-AC6). |

## 5. Out of Scope

- Detecting the OS-level `prefers-color-scheme` to choose the *initial* default before any explicit user choice — deferred; the app always starts `light` until the user toggles (clarified 2026-10-01).
- Live cross-tab theme synchronization (one tab toggling instantly updating another open tab without a reload) — not requested by R12; consistent with AS01 (single-user, no realtime channel).
- A third "system/auto" theme option — R12 only asks for a choice between light and dark.
- Per-component or per-screen theme overrides — the theme is a single, app-wide setting.
- Any visual redesign beyond swapping the token set already defined in `docs/mockup.html`'s `[data-theme=dark]` block; F08 wires the existing tokens to a persisted, server-backed setting, it does not design new ones.

## 6. Effort and Risks

- **Estimate:** S, per `specs/backlog.md` — a single toggle, two new routes over an already-defined `setting` table (no schema change needed; `data-model.md` v3 already specifies `setting` and its `CHECK` constraints), and no data-model impact.
- **Risks:** None new. RK04 (product-spec: R12–R14 add UI surface that NFR-03 must still cover) applies — the toggle is included in the keyboard walkthrough at `/test-phase`, not audited as an afterthought.

## 7. Assumptions and Clarifications

| Q-ID | Question | Answer (human) | Date |
|---|---|---|---|
| C-F08-01 | What does `GET /api/settings/theme` return before any `setting` row exists? | Return `200` with a server-side default of `"light"`; never 404/error, and the read itself does not create a row. | 2026-10-01 |
| C-F08-02 | Should the app auto-detect the OS `prefers-color-scheme` as the initial default before any explicit user choice? | No — always start `light` until the user toggles. OS-detection is deferred, not built. | 2026-10-01 |
| C-F08-03 | What should `PUT /api/settings/theme` do with an invalid body? | Reject with `400`, `error.code='INVALID_THEME'`, `field='theme'`, message `Theme must be "light" or "dark".` — matching the existing `INVALID_URL`/`INVALID_TAG` contract shape. | 2026-10-01 |
| C-F08-04 | Should the toggle's accessible label be static (mockup: always `Dark mode`) or state-aware (`Dark mode` / `Light mode`)? | State-aware. Declared as a small U6 deviation from the mockup's static label, to be justified in `lld.md` (same precedent as F07's toast-duration deviation). | 2026-10-01 |
| C-F08-05 | Is live cross-tab theme sync in scope? | No — each tab reconciles only on its own load; out of scope, consistent with AS01. | 2026-10-01 |

## 8. Constitution Check

| Clause | Status | Note |
|---|---|---|
| P4 Simplicity first | Pass | Reuses the already-approved `setting` table and AD-05 design; no new schema object, no new UI pattern beyond the mockup's existing toggle. |
| P7 Measurable requirements | Pass | R12 carries 10 Given/When/Then AC; no NFR introduced by this feature beyond the existing NFR-02/03/04, already measurable. |
| S1 Boundary validation | Pass | `PUT` body validated against a two-value allow-list (F08-AC6). |
| S4 Parameterized queries | Pass | The `setting` upsert uses a parameterized query, per `data-model.md`'s existing schema. |
| U1/U2 Keyboard and labels | Pass | F08-AC7 covers keyboard operability and `aria-pressed`; label is programmatically associated. |
| U3 Empty/loading/error states | Pass | F08-AC9 defines the behavior when the theme read fails on load — the app still renders, not a blocking error. |
| U6 Approved UX reference | Deviation declared | The toggle's accessible label is made state-aware rather than the mockup's static `Dark mode` text (C-F08-04); to be justified in `lld.md`. |

## 9. Change Log

| Date | Change | Why | Source |
|---|---|---|---|
| 2026-10-01 | Initial feature specification, Version 1, status draft | `/plan-phase F08-dark-mode`, FEATURE-CREATE | planning |
| 2026-10-01 | Status set to approved | Planning gate approved by dev-1 | planning |
