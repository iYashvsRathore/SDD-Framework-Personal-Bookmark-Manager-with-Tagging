### Evidence E-build-105

**SDLC activity:** build

**Task/feature:** F01-T12 — assembling the single-process build and discovering that Angular's default production optimizer emits markup the HLD §8 CSP blocks.

**Context given to AI:** `hld.md` §8's verbatim CSP (`default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'`), F01-AC15's stop/start procedure, and `component-map.json`.

**Prompt/request:** Point `ng build` at `app/api/public`, serve it from Express under the CSP, then execute and record the F01-AC15 restart check.

**AI response summary:** After the first build, Copilot inspected the generated `index.html` rather than assuming it was fine, and found that Angular's critical-CSS optimizer (`beasties`) injects an **inline** `<script>` to swap `media` attributes on deferred stylesheets. `script-src 'self'` blocks inline scripts, so the page would load with its stylesheets stuck at `media="print"` — broken styling, with the only symptom a console CSP violation. Copilot recommended disabling `inlineCritical` rather than adding `'unsafe-inline'` or a hash to the CSP.

**Your decision:** Accepted

**What you changed and why:** Nothing was changed — disabling `inlineCritical` was accepted as recommended, after reading through why weakening the CSP was rejected before accepting.

**How you verified it:** Rebuilt after setting `optimization.styles.inlineCritical: false` and counted inline blocks in the output: **0**. Then smoke-checked the single process: `/ -> 200`, `/api/health -> 200`, `/api/bookmarks -> 200`, `/api/tags -> 200`, with the document's response headers carrying the CSP verbatim and no `x-powered-by`. **F01-AC15 was then executed for real**: three synthetic bookmarks saved, the process stopped (confirmed down — `/api/health` returned nothing), started again, and the list re-fetched. The post-restart response was **byte-identical** to the pre-restart capture (`$b -eq $a` → `True`), with ids 3/2/1 and their `created_at` values unchanged.

**Outcome:** worked

**Iteration:** Weakening the CSP to suit the build tool was considered and rejected — the CSP is an HLD decision and `/build-feature` may not edit `hld.md`, so the build configuration gave way instead. The `<script>alert(1)</script>` title used in the AC15 run doubles as the AC16 fixture: it is stored and returned as literal text, but **rendered** confirmation still needs a human to look at the page.

**Approx. time:** 15–20 minutes

**Learning:** The framework is really doing a very brilliant job.
