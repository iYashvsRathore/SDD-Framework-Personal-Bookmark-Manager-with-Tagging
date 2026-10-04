# Technology Selection

**Version:** 1
**Status:** approved
**Approved on:** 2026-09-30
**Approved by:** dev-1
**Constitution version:** 1.0.0

> Chosen interactively with the human on 2026-09-30. Every layer lists ≥2 options with trade-offs. Every choice must satisfy the constitution (local, free/OSS, no external DB server, simple first).

## 1. Decision Summary

| Layer | Choice | Version | License | Why it suits this problem |
|---|---|---|---|---|
| Runtime / language | Node.js (JavaScript) | 24 LTS "Krypton" — **v24.18.0 installed**, confirmed by the human running `node -v` on 2026-09-30 | MIT | Satisfies A1 (runs locally, no server process beyond the app itself) and A3 (already installed on the developer's Windows machine, so nothing to provision before 2026-10-05). |
| Web framework / server | Express | **5.2.1** — verified on the npm registry, 2026-09-30. Declares `engines.node >= 18`, so v24.18.0 qualifies | MIT | Smallest framework that covers the capability need "HTTP server + JSON API for R01–R15" without pulling in an ORM, an auth layer, or a build step (P4). |
| Frontend approach | Angular single-page application, built to static assets and served by the Express component; server calls through Angular's built-in `HttpClient` | **22.2.0** — verified on the npm registry, 2026-09-30 (`@angular/core`, `@angular/cli`, `@angular/build` all 22.2.0). Angular 22 is the Active line per angular.dev. `@angular/build` declares `engines.node ^22.22.3 \|\| ^24.15.0 \|\| >=26.0.0`, and **v24.18.0 satisfies `^24.15.0`** | MIT | Chosen by the human. `HttpClient` ships with the framework, so no HTTP client dependency is added (P4). U6 conformance to `docs/mockup.html` is carried by porting the mockup's markup, CSS and state coverage into components. |
| Persistence | SQLite via `better-sqlite3` | **13.0.3** — verified on the npm registry, 2026-09-30. Declares `engines.node >= 22`, so v24.18.0 qualifies | MIT | Embedded and file-based inside the workspace, so A5 holds with no database server and no container. Prepared statements give S4 parameterized queries; a `UNIQUE` index on the normalized URL gives R10; indexes plus `LIMIT`/`OFFSET` are how NFR-01 is approached at 1,000 rows. |
| Outbound HTTP (title fetch) | `node:https` / `node:http` with a custom `lookup` function and `maxRedirects` disabled | Ships with Node 24 | MIT (Node core) | The only option considered that can inspect the **DNS-resolved address before the socket opens**, which is what S2 and NFR-04 actually require. Adds zero dependencies. Directly mitigates RK02. |
| HTML parsing (title fetch) | Bounded regular expression over the first N KB of the response body | — (no dependency) | — | R01 only needs one `<title>` element, and EC06 already defines a hostname fallback, so a parse miss degrades gracefully instead of failing. Pairs naturally with the EC08 size cap. Adds zero dependencies (P4). |
| Test framework + coverage | Vitest with V8 coverage | **5.0.3** for both `vitest` and `@vitest/coverage-v8` — verified on the npm registry, 2026-09-30. `engines.node ^22.12.0 \|\| ^24.0.0 \|\| >=26.0.0` qualifies v24.18.0. **`@angular/build` 22.2.0 lists `vitest: "^4.0.8 \|\| ^5.0.0"` as an optional peer dependency**, so Vitest 5 is the supported runner for the Angular component too | MIT | One runner across both components, which keeps the Angular testing toolchain from becoming a second thing to configure (RK01, time box). Supplies the measured percentage Q4 requires. |
| Linter / formatter | ESLint + Prettier | ESLint **10.11.0**, Prettier **3.9.9** — verified on the npm registry, 2026-09-30. ESLint declares `engines.node ^20.19.0 \|\| ^22.13.0 \|\| >=24`, which v24.18.0 satisfies | MIT | Q3 requires zero lint errors before a task is done; the Angular CLI scaffolds ESLint, so this is the path of least configuration. |
| Change detection | **Zoneless** — `provideZonelessChangeDetection()`, signal-driven state. `zone.js` is **not** a dependency | n/a — built into `@angular/core` 22.2.0 | MIT | The Angular 22 `ng new` default, so this is the path of least resistance, and it drops a ~100 KB dependency (P4). Signals suit R13 undo and R14 autocomplete. Not chosen for performance — see TD-09. |

### Rejected outright, with reasons

| Technology | Why it is not used |
|---|---|
| axios | Requested by the human in the first round, then withdrawn. **Server-side:** it cannot intercept the connection between DNS resolution and socket open, so a public hostname resolving to a private address defeats it — it cannot satisfy S2 (see TD-05). **Client-side:** Angular's `HttpClient` covers every need in R01–R15, so adding axios would contradict the human's stated preference for minimal libraries (C-2, P4). |

## 2. Decisions and Alternatives

### TD-01 Runtime / language

| Option | Pros | Cons | Fit with constitution |
|---|---|---|---|
| A: Node.js 24 LTS | Already installed (v24.18.0); one language across both components; rich standard library covering HTTP, DNS and now SQLite | Single-threaded model needs care if a slow title fetch is awaited carelessly (NFR-05 addresses this with a hard timeout) | A1 ✓ A3 ✓ D2 ✓ (MIT) |
| B: Python 3 + a WSGI framework | Very strong standard library; `sqlite3` built in | Second language in the workspace alongside Angular's TypeScript; installation status on this machine unknown | A1 ✓ D2 ✓ P4 ✗ (two ecosystems) |
| C: Node.js 22 LTS "Jod" | Also an LTS line | No advantage over 24 here, and the installed runtime is already 24 | A1 ✓ D2 ✓ |

**Decision:** A — Node.js 24 LTS (human-selected on 2026-09-30)
**Trade-off accepted:** nodejs.org's release table labels v24 as "Latest LTS (v24.21.0)" while showing an end date of 2026-09-07, which is before today's date. That inconsistency could not be resolved from the page, so no support-window claim is made here. The practical basis for the choice is that v24.18.0 is installed and working on the developer's machine, which is what A3 requires through the evaluation period.

### TD-02 Web framework / server

| Option | Pros | Cons | Fit with constitution |
|---|---|---|---|
| A: Express | Minimal surface; JSON and static-file serving in a few lines; enormous body of examples | Unopinionated, so validation and error handling are hand-written (which S1 and U5 want explicit anyway) | A1 ✓ D2 ✓ (MIT) P4 ✓ |
| B: Fastify | Faster; schema-based validation built in | Schema layer is more machinery than 15 requirements at 1,000 records need | A1 ✓ D2 ✓ P4 ~ |
| C: `node:http` alone | Zero dependencies | Routing, body parsing and static serving all hand-rolled; more code to test for no NFR gain | A1 ✓ P4 ~ |

**Decision:** A — Express (human-selected on 2026-09-30)
**Trade-off accepted:** hand-written validation and error handling instead of a schema layer. This is compatible with S1 and U5, which both call for explicit, inspectable boundary checks.
**Version note:** the current release is **Express 5.2.1**, not the 4.x that most tutorials and examples target. Express 5 changes behavior that this app touches: route patterns moved to `path-to-regexp` v8 (no bare `*` wildcard), `req.query` is a getter, rejected promises from async handlers now reach the error middleware, and several `res` signature shortcuts were removed. Copy-pasted 4.x snippets should be treated as suspect — a `/review-phase` lens.

### TD-03 Frontend approach

| Option | Pros | Cons | Fit with constitution |
|---|---|---|---|
| A: Angular SPA + `HttpClient` | The human's choice; component structure; typed HTTP; test tooling included | Build step; the mockup must be ported into components rather than served as-is; largest time cost against RK01 | A1 ✓ D2 ✓ (MIT) U6 ~ (conformance by porting) |
| B: Serve `docs/mockup.html` as a static page, wired to the Express API | U6 conformance almost by construction; no build step; smallest time cost | No component model; the existing script would need restructuring as the app grows | A1 ✓ D2 ✓ P4 ✓ U6 ✓ |
| C: Server-rendered HTML templates from Express | Escaping by default (S3); no client build | Does not match the human's stated preference for static pages with API calls | A1 ✓ S3 ✓ |

**Decision:** A — Angular (human-selected on 2026-09-30, after the trade-off below was put to them explicitly)
**Trade-off accepted:** Angular costs more time than option B against a 2026-10-05 date and 15 requirements (RK01), and U6 conformance to `docs/mockup.html` becomes a porting obligation that must be checked at review rather than something inherited for free. The human accepted this. Escaping is no longer automatic from a server template, so S3 depends on Angular's default interpolation escaping and on never using `[innerHTML]` with untrusted values — recorded as a review lens for `/review-phase`.

### TD-04 Persistence

| Option | Pros | Cons | Fit with constitution |
|---|---|---|---|
| A: `node:sqlite` (built into Node 24) | Zero dependencies; synchronous | Flagged experimental; API may change between minor Node releases | A1 ✓ A5 ✓ P4 ✓ |
| B: `better-sqlite3` | Fast synchronous binding; prepared statements; widely used; real indexes and constraints | Native module — needs a prebuilt binary for the installed Node/Windows combination, otherwise it builds from source | A1 ✓ A5 ✓ D2 ✓ (MIT) S4 ✓ |
| C: `sql.js` (SQLite compiled to WebAssembly) | No native build step at all | Database lives in memory; persistence to disk is hand-written, which puts NFR-02 at risk | A2 ✗ |

**Decision:** B — `better-sqlite3` (human-selected on 2026-09-30)
**Trade-off accepted:** a native dependency in exchange for a stable, non-experimental API. The installation risk is recorded as RK06 below, with option A as the documented fallback.
**Version note (2026-09-30):** `better-sqlite3` 13.0.3 declares **`"gypfile": false`**, which means npm does not run `node-gyp` as part of a normal install, and its `exports` map lists per-platform entry points including `./win32-x64`. Both point to prebuilt binaries rather than a source build. The published manifest also records `_nodeVersion: 24.18.0`, the same Node version installed here. This **lowers** RK06's likelihood but does not close it — nothing has been installed, so the outcome is still unverified.

### TD-05 Outbound HTTP client for the title fetch

| Option | Pros | Cons | Fit with constitution |
|---|---|---|---|
| A: `node:https` with a custom `lookup` and manual redirect handling | Can reject the connection **after** DNS resolution but **before** the socket opens; every redirect hop is re-validated explicitly; zero dependencies | Most hand-written code of the three | S2 ✓ NFR-04 ✓ P4 ✓ |
| B: `undici` with a custom dispatcher | Same control; more ergonomic API | One dependency to register and audit | S2 ✓ D2 ✓ (MIT) |
| C: axios | Familiar; concise | **No hook between DNS resolution and connection**, so a hostname that resolves to a private or loopback address is fetched anyway. Cannot satisfy S2. | S2 ✗ |

**Decision:** A — `node:https` with a custom `lookup` (human-selected on 2026-09-30)
**Trade-off accepted:** more hand-written code in exchange for a guard whose behavior is explicit and can be probe-tested case by case. RK02 rates SSRF-guard correctness as an H-impact risk, and hand-written guard code is the code that can actually be tested against each bypass shape (DNS rebinding, redirect-to-private, IPv6 loopback forms).

### TD-06 HTML title extraction

| Option | Pros | Cons | Fit with constitution |
|---|---|---|---|
| A: Bounded regex over the first N KB | Zero dependencies; only one tag is needed; pairs with the EC08 size cap | Fails on unusual markup — acceptable because EC06 defines a hostname fallback | P4 ✓ |
| B: `node-html-parser` | Robust; small footprint | A dependency added to read a single element | P4 ~ D2 ✓ (MIT) |
| C: `cheerio` | Very robust; jQuery-like API | Large transitive tree for one element | P4 ✗ |

**Decision:** A — bounded regex (human-selected on 2026-09-30)
**Trade-off accepted:** occasional failure to extract a title on unusual markup. This degrades into the already-specified R01 fallback (hostname as title plus a non-blocking notice), so the failure mode is one the user already sees and understands.

### TD-07 Test framework and coverage

| Option | Pros | Cons | Fit with constitution |
|---|---|---|---|
| A: `node:test` + `--experimental-test-coverage` | Zero dependencies; built in | Leaner reporting; a second toolchain would still be needed for Angular | Q1 ✓ Q4 ✓ P4 ✓ |
| B: Vitest + V8 coverage | One runner for both the Express and Angular components; fast watch mode; coverage included | Several dependencies | Q1 ✓ Q4 ✓ D2 ✓ (MIT) |
| C: Jest + supertest | Most widely known | Heaviest option; ESM configuration friction | Q4 ✓ P4 ✗ |

**Decision:** B — Vitest (human-selected on 2026-09-30)
**Trade-off accepted:** more dependencies than option A, in exchange for a single test toolchain across both components. Under RK01's time pressure, avoiding a second runner configuration is worth the dependency count.
**Version note (2026-09-30):** this choice is now evidence-backed rather than assumed — `@angular/build` 22.2.0 declares `vitest: "^4.0.8 || ^5.0.0"` as an optional peer dependency, so `ng test` runs on the same Vitest the api component uses. `@vitest/coverage-v8` peers on **exactly** `vitest@5.0.3`, so the two must be bumped together or neither.

### TD-08 Linter and formatter

| Option | Pros | Cons | Fit with constitution |
|---|---|---|---|
| A: ESLint + Prettier | Standard in this ecosystem; the Angular CLI scaffolds ESLint; largest rule ecosystem | Two tools and two configuration files | Q3 ✓ D2 ✓ (MIT) |
| B: Biome | One fast binary for both lint and format | Weaker Angular-specific rule coverage | Q3 ✓ P4 ✓ |

**Decision:** A — ESLint + Prettier (human-selected on 2026-09-30)
**Trade-off accepted:** two tools instead of one, in exchange for working with the Angular CLI's defaults rather than against them.

### TD-09 Angular change detection: zone-based or zoneless

| Option | Pros | Cons | Fit with constitution |
|---|---|---|---|
| A: Zone.js (`provideZoneChangeDetection`) | Plain property assignment triggers a render, so no new mental model; every Angular tutorial and Stack Overflow answer assumes it | Adds `zone.js` (~100 KB) to the bundle; patches browser async primitives at load, which distorts async stack traces; runs change detection over the **whole component tree** on every async event | D2 ✓ (MIT) P4 ✗ (one more dependency) |
| B: Zoneless (`provideZonelessChangeDetection`, signals) | One fewer dependency; the Angular 22 `ng new` default, so choosing Zone means opting **out**; change detection is scoped to the views that read a changed signal; clean stack traces; signals map well onto R13 undo and R14 tag autocomplete | UI-driving state must live in signals — a plain `this.x = 1` re-renders nothing, which is a silent failure mode rather than an error | D2 ✓ P4 ✓ |

**Decision:** B — zoneless (human-selected on 2026-09-30)
**Trade-off accepted:** the performance argument does **not** apply here and was explicitly not the basis for the choice — R15 paginates to 10/20/50 rows, so the component tree never gets large enough for whole-tree change detection to threaten NFR-01's 500 ms. The choice rests on P4 (one fewer dependency) and on matching the Angular 22 default. The accepted cost is the silent failure mode: state that drives the UI must be held in signals, and a plain field assignment that renders nothing is a debugging cost against RK01's time pressure. Recorded as a build and review lens (§10) so it is caught by inspection rather than by confusion.

## 3. Tooling Commands (copied into component-map.json by /architecture)

Two components are anticipated: **api** (Express + SQLite) and **web** (Angular). `/architecture` assigns the final ids and paths.

| Purpose | Command |
|---|---|
| Install | `npm ci` (run per component; `npm install` on first setup, before a lockfile exists) |
| Format | `npx prettier --write .` |
| Lint | `npx eslint . --fix` |
| Build / type-check | **api:** `null` — interpreted JavaScript, no build step. **web:** `npx ng build` |
| Start (dev) | **api:** `node src/server.js`. **web:** `npx ng serve` |
| Test | **api:** `npx vitest run`. **web:** `npx ng test` — Angular 22's test builder runs Vitest (see TD-07) |
| Coverage | **api:** `npx vitest run --coverage`. **web:** `npx ng test --coverage` — flag spelling **not verified**; confirm against `ng test --help` at scaffold time and correct this row |
| Dependency audit | `npm audit --omit=dev` |

## 4. Dependency Policy

- Pin exact versions. Commit the lockfile.
- Before adding a dependency, check its license, maintenance, and necessity, then record it in section 5.
- Run the audit command during `/review-phase`.
- **Never install `typescript@latest` in the web component.** See the constraint note under section 5.
- Let `ng new` choose the TypeScript and RxJS versions; do not install them by hand.
- No dependency is added for a capability the standard library already covers adequately (P4). The title fetch and title parse were both resolved this way.

## 5. Dependency Register

| Package | Version | License | Purpose | Added by (feature/phase) |
|---|---|---|---|---|
| express | 5.2.1 | MIT | HTTP server and JSON API for the api component | technology |
| better-sqlite3 | 13.0.3 | MIT | Embedded file-based persistence (A5); prepared statements (S4) | technology |
| @angular/core, @angular/common, @angular/router, @angular/forms, @angular/platform-browser | 22.2.0 | MIT | Angular SPA; `HttpClient` lives in `@angular/common/http` | technology |
| @angular/cli, @angular/build | 22.2.0 | MIT | Build, dev server and test builder for the web component | technology |
| rxjs | ^7.4.0 | Apache-2.0 | Peer dependency of `@angular/core` 22.2.0 (`^6.5.3 \|\| ^7.4.0`); scaffolded by `ng new` | technology |
| zone.js | **not used** | MIT | Optional peer of `@angular/core` (`~0.15.0 \|\| ~0.16.0`). **Omitted deliberately** — the app is zoneless (TD-09). Do not add it. | technology |
| typescript | **~6.0** — see constraint note below | Apache-2.0 | Required by the Angular toolchain | technology |
| vitest | 5.0.3 | MIT | Test runner for both components | technology |
| @vitest/coverage-v8 | 5.0.3 | MIT | Coverage measurement for Q4; peers on **exactly** vitest@5.0.3 | technology |
| eslint | 10.11.0 | MIT | Linting (Q3) | technology |
| prettier | 3.9.9 | MIT | Formatting | technology |

> **TypeScript constraint — read before installing.** `@angular/build` 22.2.0 declares `typescript: ">=6.0 <6.1"`, but the npm `latest` tag for TypeScript is **7.0.2** (verified 2026-09-30; dist-tags: `latest 7.0.2`, `beta 6.0.0-beta`, `next 7.1.0-dev`). Running `npm install typescript` in the web component therefore installs a **major version Angular 22 does not support** and the build will fail. Use whatever `ng new` pins, or install `typescript@~6.0` explicitly. The exact 6.0.x patch was not enumerated this session; 6.0.3 is known to exist (observed as a devDependency of ESLint 10.11.0).

All versions above except the TypeScript patch level were read from the npm registry on 2026-09-30 and are reproduced in §7. Node engine ranges were checked against the installed v24.18.0 and all pass.

## 6. Constitution Compliance

| Clause | How the stack complies |
|---|---|
| A1 local, no external DB | Express listens on localhost; SQLite is a file read in-process by `better-sqlite3`. No database server, no cloud service, no paid service. |
| A2 persistence across restart | The SQLite database file lives in the workspace and is reopened on start. Not browser `localStorage`, which §10 of the constitution excludes explicitly. |
| A3 runnable through evaluation | Node v24.18.0 is already installed on the developer's Windows machine. No provisioning step stands between the repository and `npm ci`. |
| A5 embedded, file-based persistence | SQLite is embedded in the process. No separate database process and no container runtime is required to start the app. |
| D2 licensing | Every runtime, framework and dependency is MIT, except TypeScript which is Apache-2.0. Both are permissive and compatible with this use. |
| P4 simplicity first | Zero dependencies added for the outbound fetch and the title parse; axios dropped once `HttpClient` covered the client side. |
| Q3 zero lint and build errors | ESLint and Prettier for both components; `ng build` type-checks the web component. |
| Q4 coverage ≥ 80% on business logic | Vitest with V8 coverage produces the measured percentage; the command is recorded in §3. |
| S1 boundary validation | URL validation is hand-written in the api component, which is where the trust boundary sits. |
| S2 SSRF-guarded server fetch | `node:https` with a custom `lookup` rejects private, loopback, link-local and reserved addresses after DNS resolution and before connecting; redirects are disabled and re-validated manually per hop. |
| S3 output escaping | Angular interpolation escapes by default. `[innerHTML]` with untrusted values is prohibited and becomes a `/review-phase` lens, since the server no longer renders HTML. |
| S4 parameterized queries | `better-sqlite3` prepared statements throughout. No string-built SQL. |
| S5 pinning and audit | Exact versions pinned, lockfiles committed, `npm audit --omit=dev` run during review. |
| S6 search text as data | SQLite `LIKE` with an `ESCAPE` clause; `%` and `_` in user input are escaped before the parameter is bound. |
| U6 UX reference | The mockup's layout, states, error placement and confirmation/undo patterns are ported into Angular components. Conformance is verified at review rather than inherited, which is the trade-off recorded in TD-03. |
| NFR-01 performance | SQLite indexes on the normalized URL and on the tag join, plus `LIMIT`/`OFFSET` pagination (R15). To be **measured** at 1,000 rows in `/test-phase`, never estimated (Q6). |

## 7. Clarifications

| Q-ID | Question | Answer (human) | Date | Affects (TD-nn) |
|---|---|---|---|---|
| T01 | Which languages are you comfortable with, and which runtimes are installed? | "for frontend i woul like to use nodejs with angular and for backend node js based express js server and for database sqllite" | 2026-09-30 | TD-01, TD-02, TD-03, TD-04 |
| T02 | Server-rendered pages, or static pages plus API calls? | "static pages with backend api calls using axios" — axios later withdrawn, see T06 | 2026-09-30 | TD-03 |
| T03 | Version policy: LTS/proven-stable or latest? | "LTS version" | 2026-09-30 | TD-01, TD-03 |
| T04 | Dependency appetite? | "Minimal libraries" | 2026-09-30 | TD-05, TD-06, all |
| T05 | Anything mandated or off-limits? | "no contraints" | 2026-09-30 | all |
| T06 | axios cannot inspect the DNS-resolved IP before connecting, so it cannot satisfy S2. Use Node's built-in client server-side? | "C-1 accept recommendation" | 2026-09-30 | TD-05 |
| T07 | Angular already ships `HttpClient`; adding axios contradicts "minimal libraries". Drop axios? | "C-2 use httpcliient instead axios" | 2026-09-30 | TD-03, dependency register |
| T08 | Angular costs time against the 2026-10-05 date and makes U6 conformance a porting obligation. Confirm Angular, or serve the mockup statically? | "C-3 Go with Angular" | 2026-09-30 | TD-03, RK01 |
| T09 | Angular "LTS" means maintenance-only; new projects normally start on Active. v22 Active or v21 LTS? | "accept recommendation" — v22 Active | 2026-09-30 | TD-03 |
| T10 | What does `node -v` report? | "v24.18.0" | 2026-09-30 | TD-01, TD-04, RK06 |

### Version verification record (2026-09-30)

All registry lookups used `https://registry.npmjs.org/<pkg>/latest`. An earlier attempt against the npmjs.com **website** returned HTTP 403; the registry API is the correct source and returned every manifest below.

| Claim | Status |
|---|---|
| Node.js v24 is the Latest LTS line; v22 also LTS; v26 Current; v20 EOL | **Verified** at nodejs.org/en/about/previous-releases. The page also shows v24 ending 2026-09-07 and v22 ending 2026-09-23 — both before today — while still labelling them LTS. This inconsistency could not be resolved and no support-window claim is made from it. |
| Node v24.18.0 is installed on the developer's machine | **Verified** by the human running `node -v` |
| Angular v22 is Active (since 2026-06-03); v21 and v20 are LTS; v2–v19 unsupported; MIT-style license | **Verified** at angular.dev/reference/releases |
| express is at 5.2.1, MIT, `engines.node >= 18` | **Verified** on the npm registry |
| better-sqlite3 is at 13.0.3, MIT, `engines.node >= 22`, `gypfile: false`, per-platform exports incl. `win32-x64` | **Verified** on the npm registry |
| @angular/core, @angular/cli and @angular/build are at 22.2.0, MIT | **Verified** on the npm registry |
| @angular/build 22.2.0 requires `engines.node ^22.22.3 \|\| ^24.15.0 \|\| >=26.0.0` — **satisfied by v24.18.0** | **Verified** on the npm registry |
| @angular/build 22.2.0 peers on `vitest ^4.0.8 \|\| ^5.0.0` and `typescript >=6.0 <6.1` | **Verified** on the npm registry |
| @angular/core 22.2.0 peers on `rxjs ^6.5.3 \|\| ^7.4.0` and `zone.js ~0.15.0 \|\| ~0.16.0` (optional) | **Verified** on the npm registry |
| vitest and @vitest/coverage-v8 are at 5.0.3, MIT; coverage peers on exactly vitest@5.0.3; `engines.node ^22.12.0 \|\| ^24.0.0 \|\| >=26.0.0` | **Verified** on the npm registry |
| eslint is at 10.11.0, MIT, `engines.node ^20.19.0 \|\| ^22.13.0 \|\| >=24` | **Verified** on the npm registry |
| prettier is at 3.9.9, MIT, `engines.node >= 14` | **Verified** on the npm registry |
| TypeScript `latest` is 7.0.2 — **outside** Angular 22's supported range | **Verified** via the typescript dist-tags endpoint. The exact newest 6.0.x patch was **not** enumerated; `~6.0` is the recorded constraint |
| A prebuilt `better-sqlite3` binary exists for Node 24 on Windows x64 | **Not verified by installation.** The manifest evidence above makes it likely; RK06 stays open until `npm install` actually runs |
| The `ng test --coverage` flag spelling | **Not verified.** Confirm at scaffold time (§3) |

## 8. Change Log

| Date | Change | Why | Approved by |
|---|---|---|---|
| 2026-09-30 | Initial technology selection, Version 1 | `/technology`, CREATE mode | pending gate approval |
| 2026-09-30 | Replaced every "confirm at install" placeholder with a registry-verified version; added the TypeScript `~6.0` constraint, the Express 5 migration note, per-component test/coverage commands, and rxjs/zone.js peers | Human asked for versions compatible with the selected Angular, Express and Node; the npm registry API succeeded where the npmjs.com website had returned 403 | pending gate approval |
| 2026-09-30 | Version 1 approved; RK06 and RK07 merged into `specs/product-spec.md` §6 | Technology gate passed | dev-1 |
| 2026-09-30 | Added TD-09 (zoneless change detection); `zone.js` marked not used in §5; added the signal-state review lens to §10 | Open question 2 from the technology gate, answered by the human after an explanation of the two change-detection models | dev-1 |

## 9. New Risk Raised by This Selection

Merged into `specs/product-spec.md` §6 at the gate rollup on 2026-09-30. That file is now the authoritative copy; the rows below are retained for the decision record.

| ID | Type | Description | Impact | Mitigation | Status |
|---|---|---|---|---|---|
| RK06 | Risk | `better-sqlite3` is a native module. If no prebuilt binary exists for Node 24 on Windows x64, `npm install` falls back to compiling from source, which requires Visual Studio Build Tools and Python — a provisioning step that would cost time against the 2026-10-05 date (RK01). Registry evidence lowers the likelihood: 13.0.3 declares `gypfile: false` and ships per-platform exports including `win32-x64`. It does not close it, because nothing has been installed. | M | **Verify at first install.** If the build fails, the documented fallback is TD-04 option A, `node:sqlite`, which ships with Node 24 and needs no native build. Switching would be a `/technology change persistence` run. | open |
| RK07 | Risk | TypeScript's npm `latest` tag is 7.0.2, while `@angular/build` 22.2.0 requires `>=6.0 <6.1`. A habitual `npm install typescript` in the web component installs an unsupported major and breaks the build. | L | Let `ng new` pin TypeScript; never install it by hand. If it must be installed explicitly, use `typescript@~6.0`. Recorded in §4 and §5. | open |

## 10. Review Lenses Carried Forward

Recorded here so `/review-phase` inherits them rather than rediscovering them.

| Lens | Origin | What to check |
|---|---|---|
| U6 mockup conformance | TD-03; human confirmation 2026-09-30 | Compare the Angular UI against `docs/mockup.html` **screen by screen** — layout, state coverage (empty, loading, error), error placement, and the confirmation/undo pattern. Conformance is not inherited from the mockup; it is ported, so it must be verified. |
| S3 escaping without a server template | TD-03 | Angular interpolation escapes by default. Flag any `[innerHTML]`, `bypassSecurityTrust*`, or direct DOM writes carrying user-supplied title, URL or tag text. |
| Express 5 vs 4 idioms | TD-02 | Reject 4.x-era snippets: bare `*` route wildcards, `res.send(status)`, and assumptions that `req.query` is a plain writable object. |
| S2 guard probes | TD-05, RK02 | Each bypass shape tested separately: DNS rebinding, redirect-to-private, IPv6 loopback forms, decimal and octal IP literals. |
| Zoneless signal state | TD-09 | Any component field that drives the template must be a `signal`, `computed` or `input`. Flag plain mutable fields read by the template — under zoneless they change without re-rendering, and the symptom is a stale UI rather than an error. Confirm `provideZonelessChangeDetection()` is present and `zone.js` appears in neither `package.json` nor `angular.json` polyfills. |
