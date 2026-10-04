### Evidence E-build-501

**SDLC activity:** build

**Task/feature:** F05-T01 — refactor `buildPredicate({ tag, q } = {})` to a clause array (LD-01), add the escaped search `LIKE` clause (LD-02), and add `normalizeSearchValue()` (LD-03) in `app/api/src/services/list-query.js`, with extended `test/list-query.test.js` coverage (F05-AC1, AC2, AC3, AC4, AC5, AC6, AC9, AC11, F05-EC2)

**Context given to AI:** `lld.md` §2 (LD-01, LD-02, LD-03), §3, §5, §9, §11; `tasks.md` F05-T01's row; the shipped `list-query.js` (F03/F04), `like-escape.js`'s `escapeLikePattern()`, and the existing `list-query.test.js` (F04's assertions, which must stay byte-identical per the task's done-check)

**Prompt/request:** Implement F05-T01 per the task brief: clause-array refactor, escaped LIKE clause for search, new normalizer, extend unit tests for all four predicate shapes and the normalizer's input table

**AI response summary:** Rewrote `buildPredicate()` as a clause-array builder (`deleted_at IS NULL` always, optional tag `EXISTS`, optional `(title LIKE ? ESCAPE '\' OR url LIKE ? ESCAPE '\')` via `escapeLikePattern(q)`), added `normalizeSearchValue(raw)` (trim, cap 200 chars, `null` for non-strings/empty/arrays, no lowercasing — unlike the tag normalizer), and extended `list-query.test.js` with `q`-only, combined tag+q, and `normalizeSearchValue` input-table tests

**Your decision:** TODO(human)

**What you changed and why:** TODO(human)

**How you verified it:** Ran `npx prettier --write .` and `npx eslint . --fix` (0 errors after fixing a self-inflicted syntax corruption from an overlapping string replacement — see Iteration), then `npx vitest run test/list-query.test.js` (29/29 passed, including the byte-identical F04 tag-only assertion), then the full suite `npx vitest run` (25 files, 437/437 passed — no regression to F01-F04)

**Outcome:** worked

**Iteration:** First attempt introduced a parsing error in both `list-query.js` and `list-query.test.js` because two `replace_string_in_file` calls matched overlapping text and merged unrelated blocks. Diagnosed from the exact `eslint`/`vitest` parse-error output, rewrote the affected regions precisely, and reran the loop — second attempt passed clean

**Approx. time:** TODO(human)

**Learning:** TODO(human)
