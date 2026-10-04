### Evidence E-testing-103

**SDLC activity:** testing

**Task/feature:** F01-add-bookmark — the two manual checks that automated tests cannot perform, carried over as open items from the build gate: F01-AC16 (rendered-in-page confirmation that a script-like title is inert) and F01-AC17 (full keyboard-only walkthrough of the add-bookmark flow).

**Context given to AI:** `spec.md` AC16 ("a title containing `<script>` or similar markup is stored and displayed as literal text, never executed") and AC17 (keyboard operability), plus the automated coverage already in place: `bookmark-service.test.js`/`bookmarks-route.test.js` prove the literal string is stored and returned unescaped over the API, and Angular's template binding is relied on for safe DOM rendering, but neither proves what actually renders in a browser.

**Prompt/request:** Asked the human to run the app, add a bookmark with a script-like title, and confirm (a) no script executes and (b) the title appears as literal visible text; and separately to complete a keyboard-only walkthrough of add/edit/delete.

**AI response summary:** Relayed the two manual steps and waited for the human's observed results rather than assuming a pass.

**Your decision:** Accepted

**What you changed and why:** N/A — no code changed for this record; it documents manual verification results as given.

**How you verified it:** Human-reported results, quoted verbatim: "1. F01-AC17 - Pass" and "2. F01-AC16 - no alert/script execute, can not verify the first one at this moment." This is read as: AC17 fully confirmed; AC16's non-execution half confirmed, its literal-text-rendering half **not yet confirmed** (recorded as Not run, not Pass).

**Outcome:** partially worked

**Iteration:** F01-AC16's literal-text-rendering visual confirmation remains open; carried into the Test Matrix as "Not run" and into Known Limitations rather than assumed.

**Approx. time:** TODO(human)

**Learning:** TODO(human)
