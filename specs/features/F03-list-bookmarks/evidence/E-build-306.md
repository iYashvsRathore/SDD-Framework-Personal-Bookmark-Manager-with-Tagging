### Evidence E-build-306

**SDLC activity:** build

**Task/feature:** F03-T08 — wiring `<app-bookmark-list>` into the app shell, the F03-AC7 restart spot check, and the F03-AC9 keyboard walkthrough.

**Context given to AI:** `spec.md` F03-AC7 (restart persistence) and F03-AC9 (keyboard access to the card actions and pagination control), `lld.md`'s wiring plan (`loadList()` once on startup, `addRequested` to `openDialog()`), and `app.ts`'s existing `openDialog(event: Event)` signature from F01.

**Prompt/request:** Build F03-T08: replace the F01 placeholder with the real list, wire it up, then run the restart spot check and the keyboard walkthrough.

**AI response summary:** Wiring `addRequested` directly to `openDialog(event)` required `BookmarkList.addRequested` to carry the real DOM event rather than `void`, since `openDialog()` uses the event to resolve the opener element for focus-return on `Esc` (the same pattern F01 already used for the header and FAB buttons). Copilot changed the output's type from `output<void>()` to `output<Event>()` and updated the one `.emit()` call site to pass `$event`, calling this out as an LLD gap (implied by T06's existing `addRequested.emit()` call, but not spelled out as a signature change) rather than a silent deviation. Two new `app.spec.ts` tests then failed on the same async-timing gap seen at T05, fixed the same way. Copilot executed the F03-AC7 restart spot check against a real running server (seeding synthetic bookmarks, capturing both pages, stopping and restarting the process, re-fetching and diffing both pages), and in doing so made and then caught its own mistake: the first cleanup attempt used a `*.sqlite*` glob that did not match the project's real `tagvault.db` file name, silently leaving seed data behind until a later reseed's unexpectedly high `total` exposed it; this was corrected and recorded honestly in `tasks.md` rather than left undocumented.

**Your decision:** Accepted — confirmed by dev-1 running the F03-AC9 keyboard walkthrough against the live app and reporting "Everything is working as expected."

**What you changed and why:** No changes — the `output<Event>()` wiring and all other T08 work were accepted as implemented.

**How you verified it:** `npx ng test --watch=false` reported **84 of 84** passing and `npx vitest run` (api) reported **309 of 309** passing after the async-timing fix. `npx ng build` completed cleanly. The declared smoke contract (`GET /`, `/api/health`, `/api/bookmarks`, `/api/tags`) returned 200/200/200/200 against a running server. The F03-AC7 restart check captured identical `items` (ids, urls, `created_at`, order) and identical `total` on both paginated pages before and after a real process stop/restart. The F03-AC9 keyboard walkthrough was performed by dev-1 against the running app (22 synthetic bookmarks seeded, two pages) and confirmed: `Tab` reaches every card's Edit then Delete in visual order, then the page-size select, then Previous/Next, each with a visible focus indicator; the page-size select carries an associated label; the current page is conveyed as text.

**Outcome:** worked

**Iteration:** No screenshot was supplied for `docs/assets/`; the verbal confirmation stands as the recorded verification.

**Approx. time:** TODO(human)

**Learning:** TODO(human)
