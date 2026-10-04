### Evidence E-build-701

**SDLC activity:** build

**Task/feature:** F07-delete-bookmark — Tasks F07-T01–F07-T04 (api-side soft-delete/restore: `restoreDuplicateUrlError`, repository/service functions, and the two new routes)

**Context given to AI:** `lld.md` sections 3–5, 8–9 (the exact function signatures, SQL, error shapes and ordering); the existing `app-error.js`, `bookmark-repository.js`, `bookmark-service.js`, `routes/bookmarks.js` for the established patterns (catch-as-backstop, service-level `Number.isInteger` guard, route `Number()` coercion).

**Prompt/request:** Implement F07-T01 through F07-T04 per `tasks.md`, one task at a time, then run the build-verify loop.

**AI response summary:** Added `restoreDuplicateUrlError(existing)` to `app-error.js` as a second, dedicated 409 constructor (never shared with `duplicateUrlError()`). Added `softDelete`, `findDeletedById`, `restore` to `bookmark-repository.js` as three prepared statements (no new transaction), with `restore` catching `SQLITE_CONSTRAINT_UNIQUE` and throwing the restore-specific error. Added `softDelete(id)`/`restore(id)` to `bookmark-service.js`, each rejecting a non-integer `id` with `NOT_FOUND` before any repository call. Added `DELETE /bookmarks/:id` and `POST /bookmarks/:id/restore` to `routes/bookmarks.js`, grouped with the existing single-resource routes.

**Your decision:** Accepted

**What you changed and why:** TODO(human)

**How you verified it:** `npx prettier --write .` and `npx eslint . --fix` (0 errors, no changes needed). `npx vitest run` — 28 files, 472 passed, 0 failed (full existing suite, no regression). Started `node src/server.js` (after discovering and killing a stale process from an earlier session that was still holding port 3000) and ran live `curl` checks: a fresh bookmark deleted (204), a second delete on the same id (404 `NOT_FOUND`), a restore (200 with the restored row), an invalid `:id` delete (404), a restore of a never-deleted id (404), and the duplicate-URL restore race — delete a row, re-add the same URL, then restore the original (409 `DUPLICATE_URL`, message `"That address has been saved again since. Nothing was restored."`, matching F07-AC7 exactly). Also ran the component-map smoke checks: `GET /api/health`, `GET /api/bookmarks`, `GET /api/tags` — all 200.

**Outcome:** worked

**Iteration:** none — all four tasks passed on the first attempt. One unplanned troubleshooting step: the first server start appeared to leave the old routes live (DELETE returned Express's own 404, "Cannot DELETE ...", rather than the new JSON NOT_FOUND body); a stale `node src/server.js` process from an earlier session was found still bound to port 3000 and was killed, then the server was restarted and the smoke checks above passed cleanly.

**Approx. time:** TODO(human)

**Learning:** When a smoke check returns an HTML "Cannot METHOD /path" 404 instead of the app's own JSON error body, that is Express's own router-miss page, not the app's error middleware — a strong signal the running process predates the edit, not that the route is missing from the code. Check `Get-NetTCPConnection`/`Get-CimInstance Win32_Process` for a stale listener on the port before assuming the new route is wrong.
