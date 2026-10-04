### Evidence E-build-103

**SDLC activity:** build

**Task/feature:** F01-T06 — a defect found by the manually executed `curl` check, not by the test suite: a malformed JSON request body returned **500 STORAGE_ERROR** instead of a 4xx.

**Context given to AI:** `hld.md` §8's error taxonomy (5xx means the server is at fault), the `AppError` code table, and the observed response from a real running server.

**Prompt/request:** Run the manual `curl` checks F01-T06's "Done when" requires, and record the actual statuses.

**AI response summary:** The 201, 409 and 400 cases matched the spec. Sending a malformed body returned `500 {"error":{"code":"STORAGE_ERROR","message":"TagVault could not save that. Your other bookmarks are safe — try again."}}` — telling the user their data was safe about a request that never reached storage. Copilot diagnosed it as body-parser raising its own `entity.parse.failed` error before any route runs, falling through to the catch-all 500, and proposed `asClientBodyError()` in `app.js` to map body-parser's `entity.parse.failed` and `entity.too.large` onto the **existing** `INVALID_URL` code and `MESSAGES.EMPTY` — deliberately inventing no new error code and no new user-facing string.

**Your decision:** Accepted

**What you changed and why:** Nothing was changed — the `asClientBodyError()` fix was accepted as recommended, after reading through the diagnosis and understanding why the existing `INVALID_URL` code was reused before accepting.

**How you verified it:** Re-ran the same `curl` against a **restarted** server and observed `{"error":{"code":"INVALID_URL","message":"Enter a web address to save.","field":"url"}}` `<== HTTP 400`. A regression test was added and `npx vitest run` went from 252 to **253 passed (253)**, exit 0, with eslint clean.

**Outcome:** worked

**Iteration:** Worth noting at the gate that neither the LLD nor the HLD specified body-parser's own error path, so no test would have caught this — only the manually executed check did. This is the strongest argument in F01 for the build loop's mandated manual smoke step.

**Approx. time:** 15–20 minutes

**Learning:** The framework is really doing a very brilliant job.
