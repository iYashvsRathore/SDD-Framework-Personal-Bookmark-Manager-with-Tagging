### Evidence E-testing-601

**SDLC activity:** testing

**Task/feature:** F06-edit-bookmark — `/test-phase F06-edit-bookmark`

**Context given to AI:** `spec.md` (13 AC, 6 edge cases), `lld.md` (14 sections incl. LD-01…LD-04, the AMD-003 amendment), `status.md`, `specs/architecture/hld.md` v3 §8, `specs/architecture/component-map.json`, `specs/constitution.md`, the `test-design` and `edge-case-discovery` skills, and the full `app/api/src/lib/app-error.js`, `app/api/src/data/bookmark-repository.js`, `app/api/src/services/bookmark-service.js`, `app/api/src/routes/bookmarks.js`, `app/web/src/app/features/bookmark-form`, `app/web/src/app/state/bookmarks.store.ts`, and `app/web/src/app/app.ts` source, plus the existing api/web test suites.

**Prompt/request:** Run `/test-phase F06-edit-bookmark` — derive test cases from the 13 AC and 6 edge cases, close the two items `lld.md` §11 carried forward (F06-AC7's ordering guarantee and F06-AC9's real-restart check), and look for any new AI-discovered edge case on the edit path.

**AI response summary:** Produced F06-TC01…TC15 in the Test Matrix. Added two new automated describe blocks to close the carried-forward items: F06-AC7's ordering guarantee (`edit-bookmark.test.js`) and F06-AC9's real-restart check (`restart-integrity.test.js`, a real file-backed SQLite connection closed and reopened, not `:memory:`). Added one new AI-discovered probe: a SQL-metacharacter/SQLi-shaped payload aimed at `PUT /api/bookmarks/:id` specifically (new describe block in `edit-bookmark.test.js`), since F01's `injection-probe.test.js` only exercised the `POST` (create) path. Ran the full suites: `npx vitest run --coverage` (api) → **511 passed (511)**, 30 files, coverage 97.05%/90.27%/96.25%/98.87% (Q4 target 80%). `npx ng test --watch=false` (web) → **207 passed (207)**, 15 files (one transient worker `SIGTERM` on the first run, unrelated to test content, resolved clean on immediate retry). F06-AC13's keyboard walkthrough was cited from the Build gate (F06-T11, dev-1 confirmed 2026-10-01) rather than re-run, since no UI code changed since.

**Your decision:** Accepted

**What you changed and why:** TODO(human)

**How you verified it:** Full suites executed as described above; all new describe blocks observed passing individually before the whole-suite re-run: F06-AC7's ordering check (`items.map(id)` = `[Y, X]`), F06-AC9's restart check (edited values returned, `created_at` byte-identical, `updated_at` advanced), and the new PUT-path security probe (3/3 observed passed — payloads round-trip as literal data or resolve to a safe 404, never a 500; the `bookmark` table intact).

**Outcome:** Worked — both carried-forward items closed with real automated checks, and the new AI-discovered probe passed with no regression to the existing 508 api / 206 web tests.

**Iteration:** Closed. `specs/features/F06-edit-bookmark/status.md` updated with the Testing gate approval and this evidence ID, approved by dev-1, 2026-10-03.

**Approx. time:** TODO(human)

**Learning:** TODO(human)
