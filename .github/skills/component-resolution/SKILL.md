---
name: component-resolution
description: 'Resolve where code lives and which commands to run by looking up component ids in specs/architecture/component-map.json (monorepo or multi-repo / multi-root workspace). Use before any code edit, build, lint, test or smoke check, and in /sync-check to validate component references.'
user-invocable: false
---

# Component Resolution

## Inputs

| Input | Required | Used for |
|---|---|---|
| `specs/architecture/component-map.json` | Yes | Ids, paths, commands, smoke checks |
| The feature's `lld.md` → Components affected | For build and test | Which ids to resolve |
| Open workspace folders | Multi-repo | Confirming each `workspaceRoot` is present |
| `hld.md` §3 | For /sync-check | Cross-checking the component table |

## Procedure

1. Read `specs/architecture/component-map.json`. If it's missing, **stop** and tell the user to run `/architecture`.
2. Read the feature's `lld.md` → **Components affected** (ids).
3. For each id:
   - Find the entry in `components[]`. If it's missing, **stop**: "Component `<id>` isn't declared. Run `/amend-architecture` or fix the id."
   - Compute the absolute target as `<workspace folder named workspaceRoot>/<path>`. `workspaceRoot: "."` means the orchestrator root, the folder that contains `specs/`.
   - **Multi-repo / multi-root:** confirm a workspace folder with that name is open (list the workspace folders or check that the path exists). If it's not open, **stop**: "Open `<repo>` as workspace folder `<workspaceRoot>` (File → Add Folder to Workspace), then retry."
   - Load `commands` (install, format, lint, build, start, test, coverage, audit) and `smoke`.
4. Use **only** these resolved paths and commands. Run commands with the component folder as the working directory.
5. Any file you create or edit must sit under one of the resolved component paths, or be a test file under that component. Otherwise, stop and ask.

## Shape reference

See [component-map.template.json](../../templates/component-map.template.json). Required per component: `id`, `type`, `workspaceRoot`, `path`, `commands`. `repo` is `null` for a monorepo, and a clone URL placeholder for multi-repo (synthetic or organization-approved; no secrets).

## Validation mode (for /sync-check)

- Every `Components affected` id in all `spec.md` and `lld.md` files exists in the JSON.
- The `hld.md` §3 table matches the JSON (id, type, workspaceRoot, path).
- Every `dependsOn` id exists.
- No two components have overlapping paths within the same workspaceRoot.

## Validation checklist

- [ ] The JSON parsed, and every referenced id resolved.
- [ ] Every target folder exists, or the task is the scaffold task.
- [ ] Multi-repo: every required workspace folder is open.
- [ ] Every file touched is under a resolved path.
- [ ] Commands ran from the component folder.

## Common errors

| Error | Correct approach |
|---|---|
| Guessing `src/` because it's conventional | Use only the resolved path |
| Running commands from the orchestrator root | Use the component folder as the working directory |
| Creating a new folder for a helper outside the component | Put it inside the component, or propose an AMD |
| Editing `component-map.json` to make a path work | Only `/amend-architecture` changes the map |
