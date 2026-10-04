# Feature Backlog

> Owners use pseudonymous handles (for example, `dev-1`). Each developer edits only their own rows. Status values: `not-started`, `planned`, `designed`, `built`, `tested`, `reviewed`, `done`, `blocked-on-AMD-<nnn>`, `blocked-on-human`.

| Feature ID | Title | Requirements | Components affected | Depends on | Owner | Status | Folder |
|---|---|---|---|---|---|---|---|
| F01 | Add Bookmark | R01, R08, R09, R10, R11 | api, web | — | dev-1 | done | specs/features/F01-add-bookmark/ |
| F02 | Tag Bookmarks | R02, R09, R14 | api, web | F01 | dev-1 | done | specs/features/F02-tag-bookmarks/ |
| F03 | List Bookmarks | R03, R08, R11, R15 | api, web | F01 | dev-1 | done | specs/features/F03-list-bookmarks/ |
| F04 | Filter by Tag | R04, R11 | api, web | F02, F03 | dev-1 | done | specs/features/F04-filter-by-tag/ |
| F05 | Search | R05, R11 | api, web | F03 | dev-1 | done | specs/features/F05-search/ |
| F06 | Edit Bookmark | R06, R08, R09, R10 | api, web | F01, F03 | dev-1 | done | specs/features/F06-edit-bookmark/ |
| F07 | Delete Bookmark | R07, R08, R11, R13 | api, web | F03 | dev-1 | done | specs/features/F07-delete-bookmark/ |
| F08 | Dark Mode | R12 | api, web | F03 | dev-1 | done | specs/features/F08-dark-mode/ |

_`Components affected` ids are declared in `specs/architecture/component-map.json` (version 1). Every feature touches both components: the API owns validation, business rules and persistence (constitution S1 — client-side checks never stand alone), and the Angular SPA owns the UI. F08 touches `api` because the theme preference is stored in the SQLite `setting` table, not in the browser (HLD AD-05)._

## App-level Gates

| Gate | Status | Approved on | Note |
|---|---|---|---|
| Constitution | approved | 2026-09-30 | v1.0.0 ratified by dev-1. Time box: app complete by 2026-10-05. |
| Product planning | approved | 2026-09-30 | product-spec.md v1 approved by dev-1. 15 requirements, 8 features, 5 NFRs. |
| Technology | approved | 2026-09-30 | `specs/technology.md` v1. Node 24 / Express 5.2.1 / Angular 22.2.0 / better-sqlite3 13.0.3. axios rejected (cannot satisfy S2). RK06, RK07 raised. |
| Architecture | approved | 2026-10-01 | `hld.md` **v4**, `data-model.md` **v3**, `er-diagram.md` **v3**, `component-map.json` v1. Components `api` (`app/api`) and `web` (`app/web`). AD-01…AD-07 chosen by dev-1. Features may now be planned in parallel. **AMD-001 applied 2026-10-01, apply gate approved by dev-1 the same day** (dotless hostnames rejected at the boundary; title-fetch notice aligned to `docs/mockup.html`). **AMD-002 applied 2026-10-01** (INV-02 folds a trailing `/` on any path, not only an empty one — raised by the F01 Build gate; no schema object changed, `user_version` still 1, no code change). **AMD-003 applied 2026-10-01, during the F06-edit-bookmark build phase** (`EDIT_CONFLICT` 409 added to §8's error-handling and trust-boundary tables; no schema, ER, or component-map change). **AMD-004 applied 2026-10-01, during the F08-dark-mode design phase** (`INVALID_THEME` 400 added to §8's error-handling table; no schema, ER, or component-map change). Plan and design every feature against `hld.md` v4 and `data-model.md` v3. |
| App-level testing | approved | 2026-10-03 | 1 new cross-feature journey test (`app-journey.test.js`): api 31 files/518 tests passed (97.34% stmts / 90.85% branch / 97.56% funcs / 99.29% lines coverage, Q4 target 80%); web 16 files/212 tests passed; smoke check 200/200/200. One Fail -> Fix -> Retest (test-authoring defect: wrong assumed response shape, fixed in the test only). Approved by dev-1. |
| App-level review | approved | 2026-10-03 | `/review-phase app`: dependency audit 0 vulnerabilities (api, web); full regression unchanged (api 31 files/518 tests, coverage 97.34%/90.85%/97.56%/99.29%; web 16 files/212 tests); smoke check 200/200/200. No new app-level finding — every Critical/High finding from the eight feature reviews (F01-RV01, F02-RV01, F08-RV01) was already fixed and verified. Final Readiness Check: R01 Partial (F01-AC16 literal-text-rendering manual check still Not run), all other R01–R15/NFR-01…05 Done. Approved by dev-1 (`E-review-901`). |
| Reflection | approved | 2026-10-03 | `/reflect`: 81 evidence records rolled up (79 Accepted, 2 Modified, 0 Rejected). AI Usage Summary, Rework, Self-Assessment and time-per-phase filled from dev-1's answers (`E-review-902`). Human Judgment, What You Would Do Differently, weakest phase, and Demo Video filename/duration left `TODO(human)` — to be completed by dev-1 before final submission. Approved by dev-1. |
