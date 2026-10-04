# F08: Dark Mode (Status)

**Owner:** dev-1
**Current status:** done

| Phase | Command | Status | Gate approved on | Evidence IDs | Notes |
|---|---|---|---|---|---|
| Planning | /plan-phase F08-dark-mode | approved | 2026-10-01 | E-planning-801 | Spec approved by dev-1. Design (LLD) may start. |
| Design (LLD) | /design-feature F08-dark-mode | approved | 2026-10-02 | E-design-801, E-design-802 | lld.md and tasks.md approved (CREATE mode). AMD-004 raised and applied inline (INVALID_THEME added to hld.md section 8, now v4). LD-01..LD-04 accepted by dev-1 ("accept all recommendation"). Build may start. |
| Build | /build-feature F08-dark-mode | approved | 2026-10-02 | E-build-801, E-build-802 | All 9 tasks (T01-T09) built in order, each verified by the build-verify loop; zero fix-attempts needed. One declared deviation: `styles.css`'s `[data-theme=dark]` tokens and `.btn.sq` rule (not listed in lld.md section 3) were folded into T09, flagged to dev-1 before GO. Final consolidated loop clean: api 472/472 tests, web 191/191 tests, both builds clean, 0 lint errors. dev-1 performed the manual keyboard/visual walkthrough against the live app before approving the gate and reported "all passed". Testing may start. |
| Testing | /test-phase F08-dark-mode | approved | 2026-10-03 | E-testing-801 | Test plan: AC1/AC4/AC6/AC8/AC9/AC10 already covered by existing `setting-repository.test.js`/`setting-service.test.js`/`settings-route.test.js`/`theme.store.spec.ts`, reused as-is. Two new blocks written: F08-AC2/AC3 structural DOM assertions in `app.spec.ts` (3 cases), F08-AC5/EC26 real file-backed restart proxy in `settings-route.test.js` (1 case), following the F06-AC9 pattern. One Fail -> Fix -> Retest: an ambiguous `expectOne` URL-only match in the AC3 click test, fixed by matching method+url, then passed. Final: api 517/517 (30 files, up from 516), web 211/211 (15 files, up from 207). api coverage 97.13% stmts / 99.05% lines over `src/services`+`src/lib` (Q4 target 80%). Web coverage not measured — `@vitest/coverage-v8`/`coverage-istanbul` not installed, consistent with every prior F01-F07 gate (all measured `api` only); recorded as a known limitation, not a failure. dev-1 performed the F08-AC7 keyboard walkthrough against the live app and reported "passed." Rolled up into `docs/04-testing.md` (Test Matrix F08-TC01-10, gate summary, AI-discovered edge cases, Fail -> Fix -> Retest, AI Interactions, Known Limitations) and `docs/03-build.md`'s Feature Evidence Matrix (Dark Mode row's "How I verified" column). Testing may proceed to `/review-phase F08-dark-mode`. |
| Review | /review-phase F08-dark-mode | approved | 2026-10-03 | E-review-801 | Two findings raised: F08-RV01 (High) — the app's CSP (`script-src 'self'`, no nonce/hash) blocked LD-02's inline pre-paint `<script>` outright in the actual served app, silently defeating the F08-AC2/AC3 no-flash guarantee in production, invisible to jsdom-based tests and the isolated CSP-header test; F08-RV02 (Low) — `THEME_STORAGE_KEY` was duplicated as a hand-typed literal in `index.html` and `theme.store.ts` with no test catching drift. Both accepted by dev-1. Fixes: moved the pre-paint script to an external same-origin `public/theme-preboot.js` (`<script src>`, still blocking) so it runs under the existing CSP with no inline exception; added `theme-preboot.spec.ts` asserting the key literal stays in sync. Verified independently: web `npx ng test --watch=false` → 212/212 (up from 211, one transient worker-pool SIGTERM retried cleanly); api `npx vitest run`/`--coverage` → 517/517, coverage unchanged 97.13%/90.53%/96.34%/99.05%; `npx ng build` output inspected directly confirms no inline script remains and `theme-preboot.js` is served externally. No Critical/High finding remains open. Rolled up into `docs/05-review.md` (Review Scope, Findings, Accepted Feedback, False Positives/Misses, AI Interactions E-review-801). Feature Definition of Done holds — status set to `done`. |
| Rolled up to docs | (automatic after each gate) | done | 2026-10-03 | | Planning content rolled into docs/01-planning.md. Design content (Fnn block, error handling, alternatives, AI Interactions) rolled into docs/02-design.md. Build content rolled into docs/03-build.md. Testing content rolled into docs/04-testing.md; Feature Evidence Matrix "How I verified" column updated in docs/03-build.md. Review content rolled into docs/05-review.md; Feature Evidence Matrix status column set to Done in docs/03-build.md. |

## Open TODO(human)

- E-planning-801: Your decision, What you changed and why, How you verified it, Approx. time, Learning
- E-design-801: Your decision, What you changed and why, How you verified it, Approx. time, Learning
- E-design-802: Your decision, What you changed and why, How you verified it, Approx. time, Learning
- E-build-801: Your decision, What you changed and why, Approx. time, Learning
- E-build-802: Your decision, What you changed and why, Approx. time, Learning
- E-testing-801: Approx. time, Learning
- E-review-801: Approx. time, Learning

## Blockers

- None. Review gate approved 2026-10-03 by dev-1. Feature Definition of Done holds; status set to `done`. All 8 backlog features (F01-F08) are now `done` — next is app-level `/test-phase app`.
