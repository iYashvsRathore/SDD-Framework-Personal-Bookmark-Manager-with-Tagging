### Evidence E-build-511

**SDLC activity:** build

**Task/feature:** F05-T11 — port `.search`, `.search input`, `.si`, `.cl`, and the `>=720px` `.search` reorder/width rule from `docs/mockup.html` into `styles.css` (`web`, F05-AC12, visual contract only)

**Context given to AI:** `tasks.md` F05-T11's row; `docs/mockup.html`'s `<style>` block (`.search`, `.search input`, `.si`, `.cl`, the `@media(min-width:720px)` reorder rule, and `.sr`); the current `styles.css`'s `.bar`/`.logo`/`.logo .ic` rules and its existing `@media (min-width: 640px)` block, as the insertion point

**Prompt/request:** Implement F05-T11 per the task brief: port the five listed rule groups numerically from the mockup

**AI response summary:** Inserted the ported rules immediately after the existing `@media (min-width: 640px)` block: `.search` (order 3, full-width row by default), `.search input` (46px min-height, 42px/46px padding for the icon/clear button), `.si` (absolute-positioned search icon), `.cl` (absolute-positioned clear button), and the `>=720px` reorder (`.search` to `order:0`, capped width, pushed right via `margin-left:auto`, `.logo` margin reset, `.bar` gap). Also added a `.sr` visually-hidden-label rule — not explicitly named in the task's rule list, but required for `search-box.html`'s (F05-T08) `<label class="sr">` to render invisibly as the reference does; without it the task's own done-check ("visually matches the reference") would not hold

**Your decision:** TODO(human)

**What you changed and why:** TODO(human)

**How you verified it:** Ran `npx prettier --write src/styles.css` and `npx eslint src --fix` (0 errors, unchanged), `npx ng build` (succeeded, 2.3s), and `npx ng test --watch=false` (12 files, 181/181 tests passed, no regression)

**Outcome:** worked

**Iteration:** None needed — clean on the first attempt

**Approx. time:** TODO(human)

**Learning:** TODO(human)
