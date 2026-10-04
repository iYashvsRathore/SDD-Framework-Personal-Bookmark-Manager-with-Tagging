---
name: accessibility-review
description: 'Accessibility and UX review of web UI: keyboard operability, visible focus, labelled form controls, error messaging, empty/loading/error states, confirmation for destructive actions, semantic HTML, color contrast. Use in /review-phase and when designing UI in /design-feature.'
user-invocable: false
---

# Accessibility and UX Review

## Inputs

| Input | Used for |
|---|---|
| `specs/constitution.md` UX/a11y clauses | The bar each item is judged against |
| `lld.md` §6 UI Changes and States, §7 Validation Rules | Expected states, messages, and focus behavior |
| Rendered HTML (running app or templates) | Checking labels, semantics, and ARIA |
| Human keyboard walkthrough notes | Keyboard and focus results |

## Checklist (record each as Pass / Fail / Not checked, with evidence)

**Keyboard**

- [ ] Every action (add, edit, delete, confirm, search, filter, clear filter) is reachable with Tab/Shift+Tab and operable with Enter/Space.
- [ ] Focus is visible. Focus order follows the visual order. No keyboard traps (including dialogs).
- [ ] After add, edit, or delete, focus moves somewhere sensible (for example, a status message or the list).

**Forms**

- [ ] Every input has a programmatic label (`<label for>` or `aria-label`). Placeholders don't count as labels.
- [ ] Required fields are indicated in text.
- [ ] Errors are shown as text next to the field and linked with `aria-describedby`. Status messages use `role="status"` or `aria-live="polite"`.
- [ ] Color is not the only indicator.

**Semantics**

- [ ] Uses landmarks (`header`, `main`, `nav`), a heading hierarchy, and lists for bookmark lists.
- [ ] Buttons are `<button>` and links are `<a href>`. External links to bookmarked sites use `rel="noopener noreferrer"`.
- [ ] Tag filter controls expose their state (`aria-pressed` or a selected `<option>`).

**States and safeguards**

- [ ] The empty state (no bookmarks), the no-results state (search or filter), and the error state (title-fetch failure, invalid input) all have friendly text and a next action.
- [ ] Delete needs confirmation (or offers undo). The confirmation is keyboard-accessible.

**Visual**

- [ ] Text contrast is at least 4.5:1 where it can be checked. Layout is usable at 200% zoom.

## How to verify

Prefer running checks: a keyboard walkthrough by the human (ask them to report observations), an inspection of the rendered HTML, or, if the stack has one, an automated a11y tool (only if it's already in `technology.md`). Record what was **actually** checked. Anything not checked is written as `Not checked`.

## Validation checklist

- [ ] Every item has Pass, Fail, or Not checked, with evidence (an observation, a file and line, or a tool output).
- [ ] Every Fail became a finding with severity and a proposed fix.
- [ ] The keyboard results come from a real walkthrough (the human's or an automated one), not from reading code.

## Common errors

| Error | Correct approach |
|---|---|
| Treating a placeholder as a label | Add `<label for>` or `aria-label` |
| `<div onclick>` used as a button | Use `<button>` |
| Marking keyboard checks "Pass" after reading templates only | Mark them `Not checked` until someone walks through |
| An error shown only in red | Add text and link it with `aria-describedby` |
