### Evidence E-build-102

**SDLC activity:** build

**Task/feature:** F01-T05 — writing the SSRF-guarded title fetcher and the `lld.md` §11 loopback honesty check that is supposed to prove the guard works.

**Context given to AI:** `hld.md` §8's blocked address ranges, `lld.md` LD-01 (the injected `{ lookup, request, clock }` seam), F01-AC13, and the LLD §11 requirement for **one** test that runs the real fetcher against a real HTTP server on `127.0.0.1`.

**Prompt/request:** Implement F01-T05 to the LLD's seam, including the mandated loopback test.

**AI response summary:** Copilot pointed out that the mandated test is impossible as specified: a real server on `127.0.0.1` is exactly what the guard blocks, so the real fetcher can never reach it. It proposed adding a fourth injected dependency, `isBlocked`, defaulted to the real guard, so the one loopback file can disable it deliberately and visibly — and warned that this seam is itself a risk, because a careless future test could disable the guard without anyone noticing.

**Your decision:** Accepted

**What you changed and why:** Nothing was changed — the added `isBlocked` seam was accepted as recommended, after reading through the proposal and understanding the risk it named before accepting.

**How you verified it:** `npx vitest run` reported **215 passed (215)** and `npx eslint .` exit 0 on attempt 2. Attempt 1 had 211 tests passing but eslint exit 1 with four `no-undef` errors on `queueMicrotask`; that was fixed by **declaring the real global** in `eslint.config.js`, not by disabling the rule. The guard is proven two ways: the probe suite asserts `request` is called **zero times** for a private resolved address, and the loopback file's fourth test runs the real fetcher **with** the guard enabled against a real loopback server and asserts `requestCalls === 0`.

**Outcome:** worked

**Iteration:** The loopback file opens with a banner comment stating that `isBlocked: () => false` disables the guard **for that file only**, so a reviewer cannot mistake it for the production path. Recorded as a Build-gate finding since it deviates from the LLD's three-dependency seam.

**Approx. time:** 15–20 minutes

**Learning:** The framework is really doing a very brilliant job.
