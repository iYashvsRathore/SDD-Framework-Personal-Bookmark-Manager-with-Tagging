### Evidence E-build-305

**SDLC activity:** build

**Task/feature:** F03-T06 — the bookmark list and card markup (count region, loading/empty/error states, card row with tags and Edit/Delete), and a test run that appeared to hang.

**Context given to AI:** `spec.md` F03-AC1/AC2/AC8/AC10/AC11/AC12 and F03-EC3/EC4/EC5, `lld.md`'s card layout, and three consecutive `npx ng test --watch=false` invocations that each produced no output for 60-150 seconds (roughly 10-20x the suite's normal run time).

**Prompt/request:** Build F03-T06, then diagnose why `ng test` appears to hang instead of completing or failing.

**AI response summary:** Rather than assume the new spec file was broken (e.g. an infinite loop in a `@for`/signal, or a malformed selector causing Angular's test harness to hang), Copilot temporarily swapped in a minimal smoke spec that only mounts `BookmarkList` and asserts it exists, leaving production code untouched. That minimal spec completed in ~7 seconds, narrowing the cause away from the component/template. Copilot then checked `Get-Process node | Select-Object Id,CPU,StartTime` while a full run was in progress and observed climbing CPU values over time (not a flat, stuck value), which is inconsistent with a deadlock. It concluded the slowness was transient environment load — independently corroborated by that same session's `eslint --fix` (~460s vs. a historical ~25s) and `ng build` (~461s) calls — and restored the full spec unchanged.

**Your decision:** Accepted

**What you changed and why:** Nothing was changed — the transient-slowness diagnosis was accepted as reasoned.

**How you verified it:** The restored, unmodified spec file passed **78 of 78** tests once the slow run completed. No application or test code was changed as part of the diagnosis — only a temporary, reverted smoke spec was used to isolate the cause.

**Outcome:** worked

**Iteration:** Documented in `tasks.md`'s Plan vs. Actual table so a future slow `ng test` run is not mistaken for a real hang without first checking process CPU usage.

**Approx. time:** 15-20 minutes

**Learning:** TODO(human)
