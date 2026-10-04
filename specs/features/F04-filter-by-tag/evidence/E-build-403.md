### Evidence E-build-403

**SDLC activity:** build

**Task/feature:** F04-T04…T10 — the frontend tag-filter layer: API client/model extensions, the extracted `tagHue()` helper, `BookmarksStore`'s tag-filter state and `refreshTagRail()`, the new `TagRail` component, `BookmarkList`'s chips-as-buttons/active-filter-chip/tag-empty-state changes, mounting `TagRail` in the app shell, and the rail/chip CSS port from `docs/mockup.html`.

**Context given to AI:** `lld.md`'s LD-03 (rail+count reload on every `loadList()`), LD-05 (`TagRail` injecting `BookmarksStore` directly, matching every other feature component), LD-06 (active-filter chip rendered inside `BookmarkList` beside `#count`, matching the mockup's actual DOM nesting); `tasks.md`'s F04-T04…T10 rows; the existing `bookmarks.store.ts`, `bookmark-list.ts/html`, `app.ts/html`, `styles.css`, and `docs/mockup.html` read directly for the exact rail/chip markup, hues, and CSS to port.

**Prompt/request:** Build F04-T04 through F04-T10, one task at a time, each followed by the build-verify loop.

**AI response summary:** T04 added `TagWithCount`/`CountBookmarksResponse` models and `listTags()`/`countBookmarks()` API methods. T05 extracted `tagHue()` into `src/app/core/tag-hue.ts` out of `BookmarkList`'s private copy. T06 added `tagFilter`/`tagRail`/`allCount` signals and `selectTag`/`toggleTagFilter`/`clearTagFilter`/`refreshTagRail()` (with its own `tagRailRequestToken` stale-response guard and the EC17 "active filter absent from the new rail" fallback) to `BookmarksStore`. T07 added the new `TagRail` component and the `tag` icon path. T08 changed `BookmarkList`'s card chips into buttons calling `store.selectTag(tag)`, added the active-filter chip beside `#count`, and the tag-empty state branch — this required updating one existing F03 assertion in `bookmark-list.spec.ts` that asserted chips were non-interactive spans, now superseded by F04. T09 mounted `<app-tag-rail />` in `app.html`; the first test run failed one pre-existing accessibility assertion (every `.ic` element must carry `aria-hidden="true"`) because the new rail icon was a bare, unwrapped `<svg class="ic">` — fixed in one attempt by wrapping it in the same `<span class="ic" aria-hidden="true">` pattern used everywhere else in the app. T10 ported the rail/chip CSS rules from the mockup.

**Your decision:** Accepted

**What you changed and why:** T09's icon markup was changed to match the established `.ic`/`aria-hidden` wrapper pattern, because the app's own existing accessibility test (not a new requirement) caught the inconsistency; T08 and T07 added `*.spec.ts` files beyond `tasks.md`'s declared file list, because every other component in this codebase carries direct unit-test coverage for its own file (constitution P6 — don't ship untested behavior) and the LLD's file list predates the per-component-test convention already established by F01-F03.

**How you verified it:** `npx ng test --watch=false` after each task: T04 → (existing suite, extended, build clean); T05 → 125 passed (9 files); T06 → 125 passed (unchanged count, new store coverage deferred to T11 as planned); T07 → 133 passed (8 new); T08 → 137 passed (4 new/updated); T09 → first run had 1 failure (the `.ic`/`aria-hidden` assertion), re-run after the fix → 137 passed; T10 → 137 passed. `npx ng build` was clean at every step (final bundle 183.37 kB initial total). Smoke (`Invoke-WebRequest http://localhost:4200/` → 200) passed after every task.

**Outcome:** worked

**Iteration:** T09 needed one fix iteration (the icon wrapper); every other task in this group passed build-verify on the first attempt.

**Approx. time:** TODO(human)

**Learning:** TODO(human)
