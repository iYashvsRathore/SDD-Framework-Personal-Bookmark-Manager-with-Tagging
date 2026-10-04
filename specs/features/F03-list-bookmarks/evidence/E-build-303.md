### Evidence E-build-303

**SDLC activity:** build

**Task/feature:** F03-T02 and F03-T03 — the shared predicate builder/real list query (`service.list()` replacing `listRecent()`/`countLive()`), and repointing `GET /api/bookmarks` at it.

**Context given to AI:** `tasks.md`'s own task split (T02 = predicate/query/service, T03 = route), `lld.md`'s AS-F03-01 predicate contract, and the mode instructions' build-verify-loop requirement that each task leave the app buildable and runnable.

**Prompt/request:** Build F03-T02, then F03-T03, one task at a time per the tasks.md order.

**AI response summary:** Before writing any code, Copilot noted that landing T02 alone would break `GET /api/bookmarks`: the route still calls `service.listRecent()`, which T02 deletes, so the declared smoke check and `list-route.test.js` would fail on a real regression the build-verify loop is required to catch. It proposed combining T02+T03 into one verified build-verify pass instead of landing a known-broken intermediate state, citing `lld.md` §13's own claim that every task leaves the app buildable and runnable, and recording the combination as a deviation rather than silently reordering `tasks.md`.

**Your decision:** Accepted

**What you changed and why:** Nothing was changed — combining T02+T03 into one build-verify pass was accepted as proposed.

**How you verified it:** `npx vitest run` reported **309 passed (309)**, exit 0, after combining the two tasks. The suite proves newest-`created_at`-first ordering with `id DESC` as the tie-break on rows sharing one identical `created_at` instant, 25 seeded rows at default size returning `size=20, page=1, total=25`, `page=99&size=10` against 25 rows returning the real last page rather than an empty array, and every F03-AC5 input over HTTP returning 200 (never 400). The declared smoke contract (`/api/health`, `/api/bookmarks`, `/api/tags`) returned 200/200/200.

**Outcome:** worked

**Iteration:** No further changes were needed; the combined pass was clean on the first attempt.

**Approx. time:** 15-20 minutes

**Learning:** TODO(human)
