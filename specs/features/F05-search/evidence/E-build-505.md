### Evidence E-build-505

**SDLC activity:** build

**Task/feature:** F05-T05 — extend `ApiService.listBookmarks(page, size, tag?, q?)` (`web`) to append `q` only when non-null, mirroring the existing `tag` convention (supports F05-AC1, wiring only)

**Context given to AI:** `lld.md` §2, §11; `tasks.md` F05-T05's row; the existing `api.service.ts` `listBookmarks()` method and its `tag`-only-when-non-null pattern

**Prompt/request:** Implement F05-T05 per the task brief: add an optional `q` parameter appended to the request params only when non-null

**AI response summary:** Added a `q?: string | null` fourth parameter to `listBookmarks()`, appending `params['q'] = q` only when `q != null`, and updated the method's doc comment to describe both `tag` and `q`'s identical non-null-only convention

**Your decision:** TODO(human)

**What you changed and why:** TODO(human)

**How you verified it:** Ran `npx prettier --write src` and `npx eslint . --fix` (0 errors — the first `npx ng build` invocation combined with the preceding `prettier`/`eslint` chain in one terminal appeared to hang for several minutes with no new output; killed that terminal and reran `eslint . --fix` alone, which completed quickly with no errors), then `npx ng build` (succeeded, 16.4s, no new chunk-size warnings), then `npx ng test --watch=false` (11 files, 167/167 passed — no regression; `--browsers=ChromeHeadless` is not a valid flag for this project's vitest-based `ng test`, corrected to the bare watch-mode flag)

**Outcome:** worked

**Iteration:** One environment hiccup — a chained `prettier && eslint && ng build` command in a single terminal call appeared to hang indefinitely (likely a terminal/PTY buffering issue, not an actual lint/build hang, since `eslint` alone completed in seconds when rerun separately); recovered by killing the stalled terminal and running each step as its own command. A separate, unrelated flag mistake (`--browsers=ChromeHeadless`) was corrected once `ng test`'s actual CLI reported the right usage

**Approx. time:** TODO(human)

**Learning:** TODO(human)
