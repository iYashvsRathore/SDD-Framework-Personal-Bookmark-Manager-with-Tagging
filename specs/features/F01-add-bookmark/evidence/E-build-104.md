### Evidence E-build-104

**SDLC activity:** build

**Task/feature:** F01-T11 — deciding where the F01-AC5 title-fetch-failure notice is actually rendered, after the acceptance criterion turned out to contradict itself.

**Context given to AI:** `spec.md` F01-AC5, `lld.md` §6's UI state table, the `#toasts` live region already present in the shell from F01-T08, and `docs/mockup.html`.

**Prompt/request:** Implement F01-T11 — the duplicate banner and the fetch-failure notice.

**AI response summary:** The banner half was implemented directly. For the notice, Copilot stopped and reported that F01-AC5 asks for two things that cannot both hold: the notice appears in "the note region below *Title*" **and** "the dialog still closes". That region is inside the `<dialog>`, so on a 201 it unmounts in the same tick the message is written and the user would never see or hear it — defeating the point of AC5. Three options were offered: (A) same text, announced in the existing `#toasts` polite region; (B) keep the dialog open when the title fell back; (C) render in both places. A was recommended; C was rejected outright as two polite regions announcing at once.

**Your decision:** Accepted

**What you changed and why:** Nothing was changed — option A (announce in `#toasts`) was accepted as recommended, after reading through all three options and understanding why C was rejected before accepting.

**How you verified it:** `npx ng test --no-watch` reported **49 passed (49)**, exit 0, on attempt 3. Attempt 2 failed the build with `TS2339: Property 'notice' does not exist on type 'BookmarksStore'` — a dead reference left behind by the change, which the compiler caught. The suite asserts the message **byte-for-byte**, including the ASCII apostrophe declared as the Q5 deviation, and asserts that a `fetched` or `user` title still yields the plain `Bookmark saved`. A separate shell test confirms the text renders inside `#toasts`.

**Outcome:** worked

**Iteration:** `lld.md` §6 was updated to record the ruling, the unchanged message text, and both rejected alternatives, so `/review-phase` reads a decision rather than raising a finding. `spec.md` still carries the contradictory wording and needs an amendment — `/build-feature` does not own it.

**Approx. time:** 15–20 minutes

**Learning:** The framework is really doing a very brilliant job.
