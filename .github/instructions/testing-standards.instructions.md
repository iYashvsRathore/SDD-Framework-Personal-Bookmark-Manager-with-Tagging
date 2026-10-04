---
description: "Use when writing, running, or reporting tests (unit, integration, API, UI, NFR checks). Tests must be executed and actual outcomes recorded; never assume a pass."
applyTo: "**/{test,tests,__tests__,spec,e2e}/**,**/*.{test,spec}.*"
---

# Testing Standards

- **Run every test you write.** Record the exact command, the counts (passed/failed/skipped), and the relevant failure output. A test that hasn't run is `Not run`, never `Pass`.
- Every acceptance criterion (`Fnn-ACx`) maps to at least one test case (`Fnn-TCxx`). Name tests after the AC or scenario they verify.
- Cover the happy path, validation (empty, malformed, overlong input), duplicates, empty states, and error states (for example, a title-fetch failure).
- Tests must be deterministic and isolated: no real network calls (stub title-fetch), temp or in-memory storage per test, and no ordering dependence.
- Use synthetic data only (`https://example.com/...`, tag names like `research`).
- Include at least one check per NFR target in `specs/product-spec.md`. Examples: a timed search over 1,000 seeded bookmarks, restart persistence, keyboard-only navigation and labelled controls, and security probes (`javascript:` URL, private-IP title fetch, `<script>` in title or search).
- When a test fails: record the failure, locate the cause, fix it (through the builder when the fix is code), re-run, and record the retest result. Never delete or weaken a test just to make it pass. If a test is wrong, say why and get human approval to change it.
- Don't mark coverage numbers unless the coverage tool actually produced them.
