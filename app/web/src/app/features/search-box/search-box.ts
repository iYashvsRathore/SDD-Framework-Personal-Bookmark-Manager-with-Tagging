import { Component, ElementRef, effect, inject, signal, viewChild } from '@angular/core';
import { ICON_PATHS } from '../../core/icons';
import { BookmarksStore } from '../../state/bookmarks.store';

/** F05-LD-04: the same debounce window `TagInput` already uses for suggestions. */
const SEARCH_DEBOUNCE_MS = 250;

/**
 * The header search field (F05-AC9, AC12, AC13).
 *
 * Mirrors `TagInput`'s debounce pattern: the store is only updated — and a
 * request only fired — 250 ms after the user stops typing. The clear button's
 * visibility is driven by a local `hasText` signal rather than the store's
 * `search` signal, so it appears and disappears immediately rather than lagging
 * behind the debounce (LD-04).
 *
 * F05-RV01: `store.search()` can also be cleared from OUTSIDE this component
 * (the no-results state's own "Clear search" button calls `store.clearSearch()`
 * directly). An `effect()` keeps the native input's value and `hasText` in sync
 * whenever the store's search text no longer matches what this component is
 * displaying, so the header never shows stale search text once the list has
 * actually gone back to unfiltered.
 */
@Component({
  selector: 'app-search-box',
  templateUrl: './search-box.html',
})
export class SearchBox {
  protected readonly icons = ICON_PATHS;
  protected readonly store = inject(BookmarksStore);

  private readonly inputRef = viewChild.required<ElementRef<HTMLInputElement>>('searchInput');

  /** Drives `#qx`'s immediate show/hide, independent of the debounced store write. */
  protected readonly hasText = signal(false);

  private debounceHandle: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    effect(() => {
      const storeValue = this.store.search();
      const input = this.inputRef().nativeElement;
      if (input.value !== storeValue) {
        input.value = storeValue;
        this.hasText.set(storeValue !== '');
      }
    });
  }

  protected onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.hasText.set(value !== '');
    this.debounceSearch(value);
  }

  /** `#qx`'s handler: cancels any pending debounce, clears the field, and reloads unfiltered. */
  protected onClear(): void {
    if (this.debounceHandle !== undefined) clearTimeout(this.debounceHandle);
    const input = this.inputRef().nativeElement;
    input.value = '';
    this.hasText.set(false);
    this.store.clearSearch();
    input.focus();
  }

  private debounceSearch(value: string): void {
    if (this.debounceHandle !== undefined) clearTimeout(this.debounceHandle);
    this.debounceHandle = setTimeout(() => {
      this.store.setSearchText(value);
    }, SEARCH_DEBOUNCE_MS);
  }
}
