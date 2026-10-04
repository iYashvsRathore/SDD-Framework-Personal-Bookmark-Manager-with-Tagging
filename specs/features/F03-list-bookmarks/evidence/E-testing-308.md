### Evidence E-testing-308

**SDLC activity:** testing

**Task/feature:** F03-list-bookmarks — F03-AC7 / NFR-02, the restart-correctness check, re-run at the full 1,000-record volume with two real process restart cycles (the build gate's spot check used only 15–22 rows and a single restart; this phase's check proves it holds at the volume NFR-01 itself requires).

**Context given to AI:** `spec.md` F03-AC7 ("both pages return the identical items... and the identical total as before the restart") and `product-spec.md` NFR-02's measurement method ("stop the application, restart it, and compare the full list against the expected set"); `data-model.md` §6's seeding recipe; `component-map.json`'s `api.dataStore.location` (`app/api/data/tagvault.db`) and `start` command (`node src/server.js`).

**Prompt/request:** `/test-phase F03-list-bookmarks` — execute the real restart-at-scale check described in the test plan preview.

**AI response summary:** Wrote a one-off seed script inserting 1,000 synthetic bookmarks (`https://example.com/article/{n}`) directly into the real on-disk SQLite file, stopped a leftover dev-server process already holding port 3000, then ran three full process cycles: start → capture page 1 and page 100 (size 10) + total → stop → start → capture and diff against the first capture → stop → start → capture and diff again.

**Your decision:** Accepted

**What you changed and why:** Nothing changed — the check ran exactly as planned across all three process starts.

**How you verified it:** Captured JSON responses to files and diffed them with `Compare-Object`. Run 1 (pre-restart baseline): `total=1000`, page1 first id=1024, page100(size10) returned 10 items, first id=34. Run 2 (after restart cycle 1): `total=1000`, **0** line differences against run 1 on both page 1 and the last page. Run 3 (after restart cycle 2): `total=1000`, **0** line differences against run 1 on both page 1 and the last page. Cleaned up the scratch JSON files, the ad-hoc seed script, and reset `app/api/data/` afterward (synthetic data only, D1).

**Outcome:** worked

**Iteration:** None — both restart cycles matched the baseline on the first attempt.

**Approx. time:** TODO(human)

**Learning:** TODO(human)
