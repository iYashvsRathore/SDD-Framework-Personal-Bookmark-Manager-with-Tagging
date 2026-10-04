import { Component, inject, output } from '@angular/core';
import { BookmarksStore } from '../../state/bookmarks.store';
import { ICON_PATHS } from '../../core/icons';
import { displayUrl } from '../../core/url-display';
import { relativeTime } from '../../core/relative-time';
import { tagHue } from '../../core/tag-hue';
import { PAGE_SIZES, type BookmarkListItem } from '../../core/models';

/**
 * The bookmark list region (F03-AC1, AC2, AC8, AC10, AC12; F03-EC3-5) plus
 * the pagination control (F03-AC4, AC6, AC9, AC10).
 *
 * Cards and tag chips are rendered here. The Edit button is wired to
 * `editRequested` (F06) and the Delete button to `deleteRequested` (F07) -
 * the parent owns what each leads to. Injects `BookmarksStore` directly,
 * matching `BookmarkForm`'s existing pattern (lld.md section 5).
 */
@Component({
  selector: 'app-bookmark-list',
  templateUrl: './bookmark-list.html',
})
export class BookmarkList {
  protected readonly store = inject(BookmarksStore);
  protected readonly icons = ICON_PATHS;
  protected readonly displayUrl = displayUrl;
  protected readonly relativeTime = relativeTime;
  protected readonly tagHue = tagHue;
  protected readonly pageSizes = PAGE_SIZES;

  /** Emitted when the empty state's *Add bookmark* button is activated. */
  readonly addRequested = output<Event>();

  /** F06: emitted when a row's Edit button is activated — carries that row and the clicked element (LD-03). */
  readonly editRequested = output<{ item: BookmarkListItem; opener: HTMLElement }>();

  /** F07: emitted when a row's Delete button is activated — carries that row and the clicked element, mirroring `editRequested`. */
  readonly deleteRequested = output<{ item: BookmarkListItem; opener: HTMLElement }>();

  protected onEditClick(item: BookmarkListItem, event: Event): void {
    this.editRequested.emit({ item, opener: event.currentTarget as HTMLElement });
  }

  protected onDeleteClick(item: BookmarkListItem, event: Event): void {
    this.deleteRequested.emit({ item, opener: event.currentTarget as HTMLElement });
  }

  /**
   * F01-AC11/F03: the duplicate banner's "View existing" action — scrolls the
   * given row into view and flashes it (ported from `docs/mockup.html`'s
   * `showDup()`). A no-op if the row is not in the current page/filter (the
   * caller clears the filter and returns to page 1 first).
   */
  scrollToAndFlash(id: number): void {
    const el = document.getElementById(`b-${id}`);
    if (!el) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 1900);
  }

  /** The page-size `<select>`'s `(change)` handler (F03-AC4). */
  protected onPageSizeChange(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    this.store.changePageSize(value);
  }

  protected previousPage(): void {
    this.store.changePage(this.store.page() - 1);
  }

  protected nextPage(): void {
    this.store.changePage(this.store.page() + 1);
  }
}
