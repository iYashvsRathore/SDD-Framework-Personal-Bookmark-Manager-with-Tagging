### Evidence E-build-702

**SDLC activity:** build

**Task/feature:** F07-delete-bookmark — Tasks F07-T05–F07-T06 (api-side test coverage for `softDelete`/`restore`: `test/delete-bookmark.test.js`, `test/restore-bookmark.test.js`)

**Context given to AI:** `lld.md` sections 4–5, 8, 11 (the sync/async shape of each function, the exact error codes/messages, and the "write tests the way the route calls it" guidance); the existing `bookmark-service.js`/`bookmark-repository.js` under test; sibling test files (`edit-conflict.test.js`, `restart-integrity.test.js`) for the established `rejects.toMatchObject` pattern used elsewhere in the suite.

**Prompt/request:** Implement F07-T05 and F07-T06 per `tasks.md`, then run the build-verify loop.

**AI response summary:** Wrote `delete-bookmark.test.js` (service + route specs for `softDelete`, covering a live delete, the already-deleted race, every invalid `:id` shape, and the live DELETE route) and `restore-bookmark.test.js` (service + route specs for `restore`, covering a successful restore, the duplicate-URL race, and every not-found shape). First `npx vitest run` showed 17 failing tests across both new files, each failure's stack trace showing the exact expected `AppError` being thrown at the exact line under test. Diagnosed this as a test-authoring bug, not a production bug: `bookmark-service.softDelete`/`restore` are plain synchronous functions (matching `list()`'s existing shape), but the new tests wrote `expect(service.softDelete(id)).rejects.toMatchObject(...)` — since the call throws synchronously while the argument to `expect()` is being evaluated, the exception propagates before `expect()`/`.rejects` ever runs, so it surfaced as the test's own uncaught exception rather than a matcher failure. Fixed every such assertion to use a `captureError(() => service.softDelete(id))` helper that catches the synchronous throw, then asserts `toMatchObject` on the captured error. Also fixed an unrelated bug in `delete-bookmark.test.js`'s `liveRows()` helper, which selected all rows instead of filtering `WHERE deleted_at IS NULL`.

**Your decision:** Accepted

**What you changed and why:** TODO(human)

**How you verified it:** `npx prettier --write .` and `npx eslint . --fix` (0 errors on both attempts). `npx vitest run` — first attempt: 2 files failed, 17 of 503 tests failed; after the fix, second attempt: 30 files passed, 503 of 503 tests passed, 0 failed.

**Outcome:** worked (after one fix iteration)

**Iteration:** 1 of the allowed 3 fix attempts was used, then all tests passed.

**Approx. time:** TODO(human)

**Learning:** A `rejects.toMatchObject(...)` assertion can only be used when the function under test genuinely returns a Promise. For a function that throws synchronously (no internal `await`), `expect(fn())` already lets the exception escape while evaluating the argument, before `.rejects` can attach — the symptom looks identical to a production bug (the stack trace shows the exact expected error) but is actually a mismatch between the test's assumed calling convention and the function's real (synchronous) shape. Confirm a function's sync/async shape before choosing `.rejects` vs. a try/catch (or `captureError`) helper.
