import { Component, ElementRef, inject, viewChild } from '@angular/core';
import { BookmarksStore } from '../../state/bookmarks.store';

/** Matches `lld.md` section 8's debounce for suggestion fetches (F02-AC12). */
const SUGGESTION_DEBOUNCE_MS = 250;

/**
 * The tag chip input (F02-AC10, AC11, AC12, AC13).
 *
 * Injects `BookmarksStore` directly, the same pattern `BookmarkForm` and
 * `BookmarkList` already use (lld.md LD-04, design alternative A) — chip commit,
 * removal and suggestion state all live on the store, not here.
 */
@Component({
  selector: 'app-tag-input',
  templateUrl: './tag-input.html',
})
export class TagInput {
  protected readonly store = inject(BookmarksStore);

  private readonly inputRef = viewChild.required<ElementRef<HTMLInputElement>>('tagInput');

  private debounceHandle: ReturnType<typeof setTimeout> | undefined;

  /**
   * Enter/comma commits the current text as a chip (AC10). Backspace on an empty
   * input removes the most recently added chip without losing focus (AC10) —
   * mirrors `docs/mockup.html`'s `tg` keydown handler.
   */
  protected onKeydown(event: KeyboardEvent): void {
    const input = this.inputRef().nativeElement;

    if ((event.key === 'Enter' || event.key === ',') && input.value.trim()) {
      event.preventDefault();
      this.commit(input.value);
      return;
    }

    if (event.key === 'Backspace' && !input.value && this.store.tags().length > 0) {
      event.preventDefault();
      this.store.removeLastTagChip();
      input.focus();
    }
  }

  /**
   * A pasted or fast-typed comma commits every part immediately (F02-EC1).
   * Choosing a `<datalist>` option fires an `input` event whose `inputType` is
   * `insertReplacementText` (F02-RV02) — that is the only reliable signal a
   * browser gives for "selected from the list" rather than "typed", so plain
   * value equality against a suggestion is not enough: a user typing through a
   * shorter existing tag name on the way to a longer one (e.g. `doc` -> `docs`
   * -> `document`) must NOT auto-commit at the `doc`/`docs` substring. Anything
   * else debounces a fresh suggestion fetch (AC12).
   */
  protected onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    const isDatalistPick = (event as InputEvent).inputType === 'insertReplacementText';

    if (value.includes(',')) {
      this.store.addTagsFromText(value);
      input.value = '';
      return;
    }

    if (isDatalistPick && value && this.store.tagSuggestions().includes(value)) {
      this.commit(value);
      return;
    }

    this.debounceSuggestions(value);
  }

  /**
   * Commits whatever text is still sitting uncommitted in the input, exactly as
   * `docs/mockup.html`'s submit handler does (`if(tg.value.trim())addTag(...)`)
   * before reading the final chip list — otherwise a typed-but-not-Enter-ed tag
   * is silently lost on save (F02-RV01). A no-op when the input is empty.
   */
  commitPendingText(): void {
    const input = this.inputRef().nativeElement;
    if (input.value.trim()) {
      this.commit(input.value);
    }
  }

  /** An immediate, un-debounced fetch, so suggestions are ready as soon as the field is reached. */
  protected onFocus(): void {
    void this.store.loadTagSuggestions(this.inputRef().nativeElement.value);
  }

  protected removeChip(name: string): void {
    this.store.removeTagChip(name);
    this.inputRef().nativeElement.focus();
  }

  private commit(raw: string): void {
    this.store.addTagChip(raw);
    this.inputRef().nativeElement.value = '';
  }

  private debounceSuggestions(prefix: string): void {
    if (this.debounceHandle !== undefined) clearTimeout(this.debounceHandle);
    this.debounceHandle = setTimeout(() => {
      void this.store.loadTagSuggestions(prefix);
    }, SUGGESTION_DEBOUNCE_MS);
  }
}
