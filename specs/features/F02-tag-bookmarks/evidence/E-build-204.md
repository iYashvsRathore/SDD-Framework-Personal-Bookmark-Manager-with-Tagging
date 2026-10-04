### Evidence E-build-204

**SDLC activity:** build

**Task/feature:** F02-T04 — atomic bookmark+tag insert and `INVALID_TAG` validation (F02-AC1, AC6, AC8, AC9, F02-EC2)

**Context given to AI:** `tasks.md`'s F02-T04 row (changed files: `bookmark-repository.js`, `bookmark-service.js`, `bookmark-service.test.js` only), plus F01's existing `bookmarks-route.test.js`, which was not listed as a file F02-T04 should touch.

**Prompt/request:** Implement F02-T04 so `insert()` always attaches a `tags` field to the saved row, and `create()` validates `payload.tags` before the duplicate lookup.

**AI response summary:** Implementing the declared behavior broke a pre-existing F01 test in `bookmarks-route.test.js` that hard-asserted the bookmark response had exactly 6 keys with no `tags` field. Since `tags` is now a permanent part of every bookmark response (F02-AC1), updated that one assertion to include `tags`, rather than leaving the full-suite regression red or reverting the new behavior.

**Your decision:** Accepted

**What you changed and why:** Nothing — accepted as-is.

**How you verified it:** In-session: `npx vitest run test/bookmark-service.test.js` — 1 file, 40/40 passed; `npx vitest run` (full suite, before the `bookmarks-route.test.js` fix) — FAILED on the stale 6-key assertion; `npx vitest run` (full suite, after the fix) — 18 files, 354/354 passed.

**Outcome:** Worked — the full suite is green and the response shape change is intentional and consistent with F02-AC1.

**Iteration:** Attempt 1 (full-suite regression caught the stale F01 assertion) → attempt 2, after updating `bookmarks-route.test.js` (354/354 passed)

**Approx. time:** Part of ~30–45 minutes spent across the whole F02 build session (not separately tracked per task).

**Learning:** A task scoped to "only touch these files" can still legitimately require a one-line fix to an unlisted file, when the new behavior is a declared, permanent contract change (not a side effect) that an older test hard-coded against; the full-suite regression step exists precisely to catch this before it ships silently broken.
