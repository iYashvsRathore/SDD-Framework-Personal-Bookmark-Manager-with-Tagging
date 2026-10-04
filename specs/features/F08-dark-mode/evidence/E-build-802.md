### Evidence E-build-802

**SDLC activity:** build

**Task/feature:** F08-dark-mode — tasks T05–T09, the full `web` surface: `Theme`/`ThemeResponse` types and `ApiService` methods, the `moon`/`sun` icons, `ThemeStore`, the inline pre-paint script, and the header toggle button

**Context given to AI:** `lld.md` sections 3, 6, 8, 10, 11 (file list, UI states, error handling, sequence diagram, test hooks); LD-01…LD-04's accepted decisions; `tasks.md`'s per-task Done-when criteria; existing `bookmarks.store.ts` (request-token idiom), `icons.ts` (single-`d`-string convention), `app.html`/`app.ts` (shell pattern), `docs/mockup.html` (exact CSS tokens and icon markup to port)

**Prompt/request:** Implement F08-T05 through F08-T09 in order, one task at a time, each ending with the build-verify loop

**AI response summary:** Added `Theme`/`ThemeResponse` to `models.ts` and `getTheme()`/`setTheme()` to `ApiService`; converted the mockup's `sun` `<circle>` into a two-arc path matching `search`'s precedent; built `ThemeStore` with `load()`/`toggle()`, a monotonic request-token guard, and a `try/catch`-wrapped `localStorage` mirror under the key `tagvault-theme`; added the inline pre-paint `<script>` to `index.html`'s `<head>` reading the same key; wired the header toggle into `app.html`/`app.ts` with a state-aware `aria-label`/`aria-pressed`. Flagged before `GO` that `lld.md` section 3 never lists `styles.css`, and that without porting the mockup's `[data-theme=dark]` token block and `.btn.sq` rule the toggle would be visually inert; folded that port into T09 with the human's prior acknowledgement.

**Your decision:** TODO(human)

**What you changed and why:** TODO(human)

**How you verified it:** After each task: `npx prettier --write` / `npx eslint --fix` (0 errors each time), `npx ng build` (succeeded 5 times across T05–T09, 3–9s each). `theme.store.spec.ts` alone: `npx ng test --watch=false --include=src/app/state/theme.store.spec.ts` → 1 file, 5 passed (load() fallback on rejected GET, load() applying the server value, toggle()'s optimistic flip, the rapid-toggle race resolving to the last call, a throwing `localStorage` not crashing `toggle()`). Full suite after T09: `npx ng test --watch=false` → 13 files, 191 passed (186 prior + 5 new, no regression). Final consolidated loop across both components: api (`npx prettier --write .`, `npx eslint . --fix`, `npx vitest run`) → 28 files, 472 passed, 0 lint errors; web (`npx prettier --write .`, `npx eslint . --fix`, `npx ng test --watch=false`) → 58 files unchanged by prettier, 0 lint errors, 13 files/191 tests passed. Started `npm start` (api, port 3000) and `npx ng serve` (web, port 4200) and handed off to dev-1 for the manual keyboard/visual walkthrough; dev-1 confirmed "all passed".

**Outcome:** worked

**Iteration:** none needed — all five tasks passed on the first attempt

**Approx. time:** TODO(human)

**Learning:** TODO(human)
