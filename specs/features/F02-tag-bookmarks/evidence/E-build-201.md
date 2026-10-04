### Evidence E-build-201

**SDLC activity:** build

**Task/feature:** F02-T05 — `routes/tags.js` prefix-branch and its test's EC4 case (F02-AC11, AC12, AC13)

**Context given to AI:** `tasks.md`'s F02-T05 Done-when text, which specifies the test case as `GET /api/tags?prefix=DA` against seeded `docs`/`design`/`database` tags returning `["database","design"]` (an example copied from `spec.md` F02-AC11), plus the LLD's documented plain-prefix-match algorithm (`findByPrefix` via `LIKE prefix% ESCAPE '\'`).

**Prompt/request:** Implement F02-T05 and its test, following the Done-when text's literal example.

**AI response summary:** Writing the test as specified failed: `GET /api/tags?prefix=DA` returned `["database"]` only, not `["database","design"]`, because "design" does not start with "da" under a correct prefix match. Identified `spec.md`/`tasks.md`'s own example as internally inconsistent with the LLD's algorithm. Replaced the EC4 test case with `prefix=DOC` → `["docs"]`, an equivalent, unambiguous case-insensitivity check, and left a comment plus a `tasks.md` Plan vs. Actual entry flagging the discrepancy instead of silently rewriting the spec.

**Your decision:** Accepted

**What you changed and why:** Nothing — accepted as-is.

**How you verified it:** In-session: `npx vitest run test/tags-route.test.js` — 1 file, 6/6 passed after the substitution; `npx vitest run` (full suite) — 19 files, 360/360 passed.

**Outcome:** Worked — the substituted test passes and the route's actual prefix-match behavior is correct; the `prefix=DA` example in `spec.md`/`tasks.md` remains unfixed pending an architect/planner decision.

**Iteration:** n/a — first attempt at T05, not yet revised

**Approx. time:** Part of ~30–45 minutes spent across the whole F02 build session (not separately tracked per task).

**Learning:** A literal example copied from one spec document into a test's Done-when text can itself be wrong — verifying it against the algorithm (not just transcribing it) caught the inconsistency before it became a false test failure blamed on the implementation.
