### Evidence E-build-510

**SDLC activity:** build

**Task/feature:** F05-T10 — mount `<app-search-box />` in `app.html`'s `.bar`, wire `app.ts` imports (`web`, F05-AC12)

**Context given to AI:** `tasks.md` F05-T10's row; the current `app.html`/`app.ts` (logo span, *Add bookmark* button, existing `imports: [BookmarkForm, BookmarkList, TagRail, Toast]` array); `docs/mockup.html`'s header DOM order (`.logo`, `.search`, *Add bookmark*, theme toggle)

**Prompt/request:** Implement F05-T10 per the task brief: mount the search box between the logo and the *Add bookmark* button, matching the mockup's DOM order

**AI response summary:** Added a `<div class="search"><app-search-box /></div>` between the `.logo` span and the *Add bookmark* button in `app.html`; added the `SearchBox` import and listed it in `app.ts`'s `@Component({ imports: [...] })` array

**Your decision:** TODO(human)

**What you changed and why:** TODO(human)

**How you verified it:** Ran `npx prettier --write src/app/app.html src/app/app.ts` and `npx eslint src/app/app.ts --fix` (0 errors, both unchanged by prettier), `npx ng build` (succeeded, 3.1s), and `npx ng test --watch=false` (12 files, 181/181 tests passed, no regression)

**Outcome:** worked

**Iteration:** None needed — clean on the first attempt

**Approx. time:** TODO(human)

**Learning:** TODO(human)
