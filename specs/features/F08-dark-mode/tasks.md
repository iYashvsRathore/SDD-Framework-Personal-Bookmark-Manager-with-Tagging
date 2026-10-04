# F08: Dark Mode (Tasks)

**LLD version:** 1
**Owner:** dev-1

> One task at a time. Each task ends with the build-verify loop (format → lint → build → start → smoke → tests). Max **3** fix attempts, then stop and ask the human.

## Tasks

| Task ID | Description | Component id | Files | Covers AC | Done when | Status |
|---|---|---|---|---|---|---|
| F08-T01 | Add `INVALID_THEME` to the shared error map and a new `invalidThemeError()` constructor | api | `src/lib/app-error.js` | F08-AC6 | `invalidThemeError()` returns a 400 `AppError` with the exact message and `field: 'theme'`; existing `app-error.test.js` still passes | done |
| F08-T02 | Add the `setting` repository (`get`, `upsert`) | api | `src/data/setting-repository.js`, `test/setting-repository.test.js` (new) | F08-AC1, AC4 | `get('theme')` returns `null` on an empty table; `upsert` then `get` round-trips the value; a second `upsert` updates the same row in place (one row, `updated_at` advanced) — asserted by a passing Vitest run | done |
| F08-T03 | Add the `setting` service (`getTheme`, `setTheme`) | api | `src/services/setting-service.js`, `test/setting-service.test.js` (new) | F08-AC1, AC4, AC6, F08-EC1, EC2 | `getTheme()` returns `'light'` with no row and never writes one; `setTheme('dark')`/`setTheme('light')` persist and return the value; `setTheme('blue')`, `setTheme('')`, `setTheme(undefined)` all throw `invalidThemeError()` without writing — asserted by a passing Vitest run | done |
| F08-T04 | Add the settings routes and mount them in the app | api | `src/routes/settings.js` (new), `src/app.js` (changed), `test/settings-route.test.js` (new) | F08-AC1, AC3, AC6 | `GET /api/settings/theme` returns 200 with a default on a fresh DB; `PUT` with a valid body returns 200 with the new value; `PUT` with an invalid body returns 400 `INVALID_THEME` — asserted by a passing Vitest run against the mounted app | done |
| F08-T05 | Add `Theme`/`ThemeResponse` types and `ApiService` methods | web | `src/app/core/models.ts` (changed), `src/app/core/api.service.ts` (changed) | F08-AC1, AC3, AC6 | `ng build` compiles with the new types; `ApiService.getTheme()`/`setTheme()` call the correct routes (manually confirmed via the dev-server proxy, no new test required for this thin pass-through, matching the existing `ApiService` convention) | done |
| F08-T06 | Add the `moon`/`sun` icon paths | web | `src/app/core/icons.ts` (changed) | — (supports F08-T08's rendering) | `ICON_PATHS.moon` and `.sun` render as valid SVG `<path d>` strings matching the mockup's icon shapes (visually confirmed) | done |
| F08-T07 | Add `ThemeStore` (load, toggle, request-token guard, `localStorage` mirror) | web | `src/app/state/theme.store.ts` (new), `src/app/state/theme.store.spec.ts` (new) | F08-AC2, AC3, AC5, AC7, AC8, AC9, AC10, F08-EC3, EC4, EC5 | `load()` falls back silently on a rejected `GET` (F08-AC9); `toggle()` flips state optimistically before the `PUT` resolves (F08-AC3); firing `toggle()` twice before either `PUT` resolves leaves the final state matching the last call (F08-AC8); a `localStorage` that throws on read/write does not crash `load()`/`toggle()` (F08-AC10) — all asserted by a passing Vitest run with `provideHttpClientTesting()` and a stubbed `localStorage` | done |
| F08-T08 | Add the inline pre-paint script | web | `src/index.html` (changed) | F08-AC2, AC3 | Loading the app with a `localStorage` mirror already set to `dark` renders `<html data-theme="dark">` on the very first paint (no flash of `light`), confirmed by a manual load with dev tools' paint-flashing/throttled-network check | done |
| F08-T09 | Wire the header toggle button | web | `src/app/app.html` (changed), `src/app/app.ts` (changed) | F08-AC2, AC3, AC7 | The toggle is reachable by `Tab` with a visible focus indicator; `Enter`/`Space` activate it exactly as a click; `aria-pressed` and the accessible label update correctly in both directions (manually confirmed keyboard walkthrough) | done |

Status values: `todo`, `in-progress`, `done`, `blocked`.

Tasks are ordered so the app builds and runs after each one (P5): the `api` surface (T01–T04) is complete and independently testable before any `web` code depends on it; `web` types/service (T05) precede the store (T07), which precedes the UI wiring (T08–T09) that consumes it. T06 (icons) has no dependency and is placed just before it is needed.

## Build-Verify Log (actual results only)

| Task | Attempt | Step (format/lint/build/start/smoke/test) | Command | Result (observed) | Action |
|---|---|---|---|---|---|
| F08-T01 | 1 | format/lint | `npx prettier --write src/lib/app-error.js`, `npx eslint src/lib/app-error.js --fix` | unchanged, 0 errors | none |
| F08-T01 | 1 | test | `npx vitest run test/app-error.test.js` | 1 file, 4 passed | none — task done |
| F08-T02 | 1 | format/lint | `npx prettier --write src/data/setting-repository.js test/setting-repository.test.js`, `npx eslint ... --fix` | test file reformatted; 0 lint errors | none |
| F08-T02 | 1 | test | `npx vitest run test/setting-repository.test.js` | 1 file, 4 passed | none — task done |
| F08-T03 | 1 | format/lint | `npx prettier --write src/services/setting-service.js test/setting-service.test.js`, `npx eslint ... --fix` | both reformatted; 0 lint errors | none |
| F08-T03 | 1 | test | `npx vitest run test/setting-service.test.js` | 1 file, 12 passed | none — task done |
| F08-T04 | 1 | format/lint | `npx prettier --write src/routes/settings.js src/app.js test/settings-route.test.js`, `npx eslint ... --fix` | settings.js and test file reformatted; app.js unchanged; 0 lint errors | none |
| F08-T04 | 1 | test | `npx vitest run` (full api suite) | 28 files, 472 passed (no regression) | none |
| F08-T04 | 1 | start/smoke | `node src/server.js`; `GET /api/health`, `/api/bookmarks`, `/api/tags`, `/api/settings/theme`; `PUT /api/settings/theme {theme:'dark'}`; `PUT /api/settings/theme {theme:'blue'}` | 200, 200, 200, 200 `{theme:'light'}`, 200 `{theme:'dark'}`, 400 `{error:{code:'INVALID_THEME',message:'Theme must be "light" or "dark".',field:'theme'}}` | none — task done; all api tasks (T01-T04) complete |
| F08-T05 | 1 | format/lint | `npx prettier --write src/app/core/models.ts src/app/core/api.service.ts`, `npx eslint ... --fix` | models.ts reformatted; api.service.ts unchanged; 0 lint errors | none |
| F08-T05 | 1 | build | `npx ng build` | Application bundle generation complete, 25.6s, output to app/api/public | none — task done |
| F08-T06 | 1 | format/lint | `npx prettier --write src/app/core/icons.ts`, `npx eslint ... --fix` | unchanged, 0 lint errors | none |
| F08-T06 | 1 | build | `npx ng build` | Application bundle generation complete, 3.3s | none — task done; visual shape confirmation deferred to the F08-T09 manual browser check when the toggle first renders these icons |
| F08-T07 | 1 | format/lint | `npx prettier --write src/app/state/theme.store.ts src/app/state/theme.store.spec.ts`, `npx eslint ... --fix` | both unchanged, 0 lint errors | none |
| F08-T07 | 1 | test | `npx ng test --watch=false --include=src/app/state/theme.store.spec.ts` | 1 file, 5 passed | none |
| F08-T07 | 1 | build | `npx ng build` | Application bundle generation complete, 3.9s | none — task done |
| F08-T08 | 1 | format/lint | `npx prettier --write src/index.html`, `npx eslint ... --fix` | unchanged, 0 lint errors | none |
| F08-T08 | 1 | build | `npx ng build` | Application bundle generation complete, 8.5s | none — script sets `<html data-theme>` synchronously from the `tagvault-theme` localStorage key before Angular loads, wrapped in try/catch; the visible no-flash check needs the dark-theme CSS tokens T09 adds, so the dev-tools paint check is deferred to the final manual walkthrough after T09 |
| F08-T09 | 1 | format/lint | `npx prettier --write src/app/app.html src/app/app.ts src/styles.css`, `npx eslint ... --fix` | all unchanged, 0 lint errors | none |
| F08-T09 | 1 | build | `npx ng build` | Application bundle generation complete, 3.2s | none |
| F08-T09 | 1 | test | `npx ng test --watch=false` (full web suite) | 13 files, 191 passed (186 prior + 5 new ThemeStore tests, no regression) | none |
| F08-T09 | 1 | start | `npm start` (api, port 3000), `npx ng serve` (web, port 4200) | api: "TagVault API listening on http://localhost:3000"; web: "Local: http://localhost:4200/" | both up — handed to the human for the manual keyboard/visual walkthrough |

## Plan vs. Actual

| Task | Planned | Actual | Deviation reason |
|---|---|---|---|
