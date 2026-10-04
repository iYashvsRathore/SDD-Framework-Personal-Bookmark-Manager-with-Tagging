<!-- GUIDE: The task table is filled by /design-feature from lld.md §3. The Build-Verify Log and Plan vs. Actual are filled by /build-feature with observed results only. Remove this comment once the task table is filled. -->
# Fnn: <Feature Title> (Tasks)

**LLD version:** <n>
**Owner:** <handle>

> One task at a time. Each task ends with the build-verify loop (format → lint → build → start → smoke → tests). Max **3** fix attempts, then stop and ask the human.

## Tasks

| Task ID | Description | Component id | Files | Covers AC | Done when | Status |
|---|---|---|---|---|---|---|
| Fnn-T01 | | | | Fnn-AC1 | | todo |

Status values: `todo`, `in-progress`, `done`, `blocked`.

<!-- GUIDE: Order the tasks so the app builds and runs after each one (P5). The first task scaffolds the component if it doesn't exist. "Done when" is a runnable check, not "code written". -->

## Build-Verify Log (actual results only)

| Task | Attempt | Step (format/lint/build/start/smoke/test) | Command | Result (observed) | Action |
|---|---|---|---|---|---|

## Plan vs. Actual

| Task | Planned | Actual | Deviation reason |
|---|---|---|---|

<!-- Completion checklist (then remove this comment):
- [ ] Design: every AC is covered by at least one task. Every file resolves through component-map.json.
- [ ] Build: every task is done or blocked, and has a log row with an observed result.
- [ ] Build: attempts per task ≤ 3. Deviations have reasons.
-->
