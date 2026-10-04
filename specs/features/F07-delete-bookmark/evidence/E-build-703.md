### Evidence E-build-703

**SDLC activity:** build

**Task/feature:** F07-delete-bookmark — Task F07-T07 (web-side API contract: `RestoreBookmarkResponse` type, `ApiService.deleteBookmark(id)`/`restoreBookmark(id)`)

**Context given to AI:** `lld.md` sections 3–4 (the exact type/method signatures); the existing `models.ts`/`api.service.ts` for established conventions (`firstValueFrom`, relative URLs, JSDoc referencing the AC).

**Prompt/request:** Implement F07-T07 per `tasks.md`, then run the build-verify loop.

**AI response summary:** Added `export type RestoreBookmarkResponse = CreateBookmarkResponse;` to `models.ts`. Added `deleteBookmark(id): Promise<void>` (DELETE, 204 success) and `restoreBookmark(id): Promise<RestoreBookmarkResponse>` (POST, parsed `{ bookmark }`) to `ApiService`. First `npx ng build` failed with `TS2552: Cannot find name 'RestoreBookmarkResponse'` — a missing import, fixed by adding it to the existing `./models` type import. Second build succeeded, but `npx ng test` then showed 18 failures, all in `search-box.spec.ts`, unrelated to the edited files' symbols. Traced to an already-present, unexplained change in the working tree: `models.ts`'s `DEFAULT_PAGE_SIZE` had been set to `10` (it should be `20` per F03-AC5, confirmed via `git diff` against the last commit) — reverted it back to `20`, which fixed all 18 failures with no further changes.

**Your decision:** Accepted

**What you changed and why:** TODO(human)

**How you verified it:** `npx prettier --write` / `npx eslint --fix` on both files (unchanged, 0 errors). `npx ng build` — failed once (missing import), passed on the second attempt. `npx ng test --watch=false` — 13 files passed, 191 of 191 tests passed (after the `DEFAULT_PAGE_SIZE` revert; 18 failures beforehand, all in the unrelated `search-box.spec.ts`).

**Outcome:** worked (after one fix iteration)

**Iteration:** 1 of the allowed 3 fix attempts was used for the missing import; the `DEFAULT_PAGE_SIZE` revert was a separate, pre-existing issue discovered during this task's verification, not a fix attempt against F07-T07's own code.

**Approx. time:** TODO(human)

**Learning:** Always run `git diff` on files you did not believe you touched before trusting a test failure's apparent cause — `search-box.spec.ts`'s failures initially looked plausible as a caused-by-this-task regression, but `git diff` against the last commit immediately showed the real, unrelated change (`DEFAULT_PAGE_SIZE: 20 → 10`) that predated this task's edits.
