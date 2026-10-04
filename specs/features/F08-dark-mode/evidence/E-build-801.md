### Evidence E-build-801

**SDLC activity:** build

**Task/feature:** F08-dark-mode — tasks T01–T04, the full `api` surface: `invalidThemeError()`, the `setting` repository, the `setting` service, and the `GET`/`PUT /api/settings/theme` routes mounted in `app.js`

**Context given to AI:** `lld.md` sections 3–5, 7, 8 (exact file list, statements, validation rule, error message); `tasks.md`'s per-task Done-when criteria; `data-model.md`'s already-existing `setting` table (AD-05, INV-11); existing `tag-repository.js`, `tags.js`, `app-error.js`, `app.js` as the pattern to follow

**Prompt/request:** Implement F08-T01 through F08-T04 in order, one task at a time, each ending with the build-verify loop

**AI response summary:** Added `INVALID_THEME: 400` to `STATUS_BY_CODE` and `invalidThemeError()` (mirroring `duplicateUrlError()`/`editConflictError()`); `setting-repository.js` with `get`/`upsert` prepared statements; `setting-service.js` with `getTheme()` (default-without-write) and `setTheme()` (allow-list validation before any repository call); `settings.js` router; mounted `settingRepository`/`settingService`/`createSettingsRouter` into `app.js` alongside the existing repositories/services

**Your decision:** TODO(human)

**What you changed and why:** TODO(human)

**How you verified it:** Ran `npx vitest run` per new/changed test file after each task (4, 4, 12, and the route tests passed), then the full suite: `npx vitest run` → 28 files, 472 tests passed, 0 failed (no regression). Started a fresh server (`node src/server.js`) and ran `Invoke-WebRequest` smoke checks: `GET /api/health` → 200, `GET /api/bookmarks` → 200, `GET /api/tags` → 200, `GET /api/settings/theme` → 200 `{"theme":"light"}`, `PUT /api/settings/theme {theme:"dark"}` → 200 `{"theme":"dark"}`, `PUT /api/settings/theme {theme:"blue"}` → 400 `{"error":{"code":"INVALID_THEME","message":"Theme must be \"light\" or \"dark\".","field":"theme"}}`. All observed bodies match `lld.md` section 4/7/8 exactly.

**Outcome:** worked

**Iteration:** none needed — all four tasks passed on the first attempt

**Approx. time:** TODO(human)

**Learning:** TODO(human)
