### Evidence E-build-502

**SDLC activity:** build

**Task/feature:** F05-T02 — extend `bookmark-service.js`'s `list({ page, size, tag, q })` to normalize `q` via `normalizeSearchValue()` and thread it into `buildPredicate()` alongside `tag`, with new unit tests in `test/bookmark-service.test.js` (F05-AC1, AC2, AC3, AC4, AC5, AC6, AC9, AC10, F05-EC3, F05-EC4)

**Context given to AI:** `lld.md` §2, §11; `tasks.md` F05-T02's row; the already-refactored `list-query.js` (F05-T01, `buildPredicate({ tag, q })` and `normalizeSearchValue()`); the existing `bookmark-service.js` `list()` method and its F03/F04 test organization (`makeService()` helper, `seedTagged()` local helper inside the F04 describe block)

**Prompt/request:** Implement F05-T02 per the task brief: thread `q` through the service's `list()` call to `buildPredicate()`, and add unit tests against a real `:memory:` schema for title-only, URL-only, case-insensitive, `%`/`_`-literal, quote/`<script>`-literal, and combined search+tag fixtures

**AI response summary:** Updated `bookmark-service.js`'s import to add `normalizeSearchValue` and changed `list()` to call `buildPredicate({ tag: normalizeTagFilterValue(tag), q: normalizeSearchValue(q) })`. Added a new `describe('F05 — list({ q }) search', ...)` block to `bookmark-service.test.js` with a `seedBookmark()` helper and ten test cases covering: title-only match (F05-AC1), URL-only match (F05-AC2/EC4), case-insensitivity (F05-AC3), literal `%` (F05-AC4), literal `_` (F05-AC5), quote and `<script>` payloads matched literally without throwing (F05-AC6), combined tag+search intersection (F05-AC9/EC3), and a page/total sanity check (F05-AC10's service-level precondition — the actual page-reset-to-1 behavior is the web store's responsibility per F05-T07)

**Your decision:** TODO(human)

**What you changed and why:** TODO(human)

**How you verified it:** Ran `npx prettier --write .` and `npx eslint . --fix` (0 errors), then `npx vitest run test/bookmark-service.test.js` (55/55 passed, 26 new), then the full suite `npx vitest run` (25 files, 446/446 passed — no regression to F01-F04)

**Outcome:** worked

**Iteration:** None needed this time — the production-code edit and the new test block were both syntactically clean on the first attempt (more careful, non-overlapping `replace_string_in_file` targeting after the F05-T01 corruption lesson)

**Approx. time:** TODO(human)

**Learning:** TODO(human)
