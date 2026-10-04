### Evidence E-build-203

**SDLC activity:** build

**Task/feature:** F02-T11/F02-T12 — end-to-end wiring check and keyboard walkthrough against the running app (F02-AC1, AC10, AC11, AC12, AC13)

**Context given to AI:** The running app (`node src/server.js` serving the `npx ng build` output at `http://localhost:3000`), a bookmark saved via `Invoke-RestMethod` with `tags: ["Research","docs"]`, and a request for the human to exercise the Add-bookmark dialog's tag input by hand (Enter/comma commit, Tab order, Backspace removal, remove-button labels, suggestion list).

**Prompt/request:** Human ran through the five checks and reported: (1) the saved bookmark's card shows both tag chips — "Yes exist"; (2a) Enter/comma commit — "worked"; (2b) Tab order with visible focus outline — "Worked"; (2c) Backspace-on-empty removes the last chip, focus stays — "Worked"; (2d) remove-button `aria-label` — "Worked"; (2e) suggestion list appears but "the drop down look and feed is very bad".

**AI response summary:** Recorded all five results verbatim in `tasks.md`'s Build-Verify Log and marked F02-T11/T12 `done`. For 2e, identified that `<datalist>`'s rendering (position, colours, spacing of the options box) is drawn by the browser itself and cannot be restyled with CSS — this is the LLD's explicit, accepted trade-off (§6/§7.2: ported verbatim from `docs/mockup.html` rather than building a custom dropdown) — so it was not treated as a code defect to silently fix. Added a `tasks.md` Plan vs. Actual entry flagging it as a finding for `/review-phase` to decide whether a future amendment should replace `<datalist>` with a styleable custom listbox.

**Your decision:** Accepted

**What you changed and why:** Nothing — accepted as-is. The `<datalist>` styling finding is left open for `/review-phase` rather than fixed here.

**How you verified it:** Human-performed manual verification in a browser against the running app (not an automated test); the AI additionally confirmed the API-level contract first via `Invoke-RestMethod` (`POST /api/bookmarks` with tags, then `GET /api/bookmarks` showing `tags: ["docs","research"]`, and `GET /api/tags?prefix=d` returning `["docs"]`).

**Outcome:** Worked — all functional keyboard/ARIA behavior confirmed; one cosmetic finding (native `<datalist>` styling) left open for `/review-phase`.

**Iteration:** n/a — single walkthrough, not yet revised

**Approx. time:** Part of ~30–45 minutes spent across the whole F02 build session (not separately tracked per task).

**Learning:** TODO(human)
