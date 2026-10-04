### Evidence E-build-506

**SDLC activity:** build

**Task/feature:** F05-T06 — add `search` and `x` icon paths to `icons.ts` (`web`), ported numerically from `docs/mockup.html`'s icon set (supports F05-AC7, AC12)

**Context given to AI:** `lld.md` §2, §11; `tasks.md` F05-T06's row; the existing `icons.ts` `ICON_PATHS` map and its single-`<path [attr.d]>`-per-icon rendering convention (confirmed via `bookmark-list.html`'s usage); `docs/mockup.html`'s icon definitions (`const P = {...}`), which render `search` as a separate `<circle>` + `<path>` pair and `x` as a two-subpath `<path>`; `styles.css`'s `.ic svg` rule (`fill: none; stroke: currentColor`), confirming every icon is stroke-only so multiple `M`-prefixed subpaths in one `d` string render identically to separate elements

**Prompt/request:** Implement F05-T06 per the task brief: add `search` (circle + handle) and `x` icon paths

**AI response summary:** Discovered no pre-existing `x` icon was actually present in `icons.ts` (the LLD's reference to an "existing x-icon precedent" did not match the shipped code) — both icons were added fresh. Converted mockup's `<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>` into a single `d` string using two 7-radius arcs to draw the circle followed by a second `M`-prefixed subpath for the handle line (`M18 11a7 7 0 1 1-14 0 7 7 0 1 1 14 0M20 20l-3.5-3.5`); ported `x` directly from the mockup's two-line `d` (`M18 6 6 18M6 6l12 12`)

**Your decision:** TODO(human)

**What you changed and why:** TODO(human)

**How you verified it:** Ran `npx prettier --write src/app/core/icons.ts` and `npx eslint src/app/core/icons.ts --fix` (0 errors), then `npx ng build` (succeeded, 2.2s, no new warnings). No automated visual-equivalence check was run — the task's done-check ("render visually equivalent to the reference") is a visual judgment deferred to the human's manual verification once F05-T08/T09/T10 wire these icons into the UI

**Outcome:** worked

**Iteration:** None needed — clean on the first attempt

**Approx. time:** TODO(human)

**Learning:** TODO(human)
