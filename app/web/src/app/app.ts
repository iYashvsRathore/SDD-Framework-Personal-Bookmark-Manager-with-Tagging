import { Component, inject, viewChild } from '@angular/core';
import { ICON_PATHS } from './core/icons';
import { BookmarkForm } from './features/bookmark-form/bookmark-form';
import { BookmarkList } from './features/bookmark-list/bookmark-list';
import { DeleteConfirm } from './features/delete-confirm/delete-confirm';
import { SearchBox } from './features/search-box/search-box';
import { TagRail } from './features/tag-rail/tag-rail';
import { Toast } from './features/toast/toast';
import { BookmarksStore } from './state/bookmarks.store';
import { ThemeStore } from './state/theme.store';
import type { BookmarkListItem, CreateBookmarkRequest } from './core/models';

/**
 * The application shell (F01-AC17, F03-T08).
 *
 * Renders the header with its *Add bookmark* button, the FAB, the add dialog,
 * the delete confirmation dialog (F07), the toast region, the tag rail (F04),
 * and the real bookmark list (F03). The list is loaded once on startup.
 */
@Component({
  selector: 'app-root',
  imports: [BookmarkForm, BookmarkList, DeleteConfirm, SearchBox, TagRail, Toast],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly icons = ICON_PATHS;
  protected readonly store = inject(BookmarksStore);
  protected readonly theme = inject(ThemeStore);

  private readonly form = viewChild.required(BookmarkForm);
  private readonly list = viewChild.required(BookmarkList);
  private readonly deleteConfirm = viewChild.required(DeleteConfirm);

  constructor() {
    void this.store.loadList();
    void this.theme.load();
  }

  /** The opener is passed explicitly so Esc returns focus to the right button. */
  protected openDialog(event: Event): void {
    this.form().open(event.currentTarget as HTMLElement);
  }

  protected async onSubmitted(payload: CreateBookmarkRequest): Promise<void> {
    const saved = await this.store.save(payload);
    // A failure leaves the dialog open so the typed address is not lost.
    if (saved) this.form().close();
  }

  /** F06-T09/T10: a row's Edit button opens the dialog pre-filled from that row (LD-03). */
  protected onEditRequested(event: { item: BookmarkListItem; opener: HTMLElement }): void {
    this.form().openEdit(event.item, event.opener);
  }

  /** F07-AC1: a row's Delete button opens the confirmation dialog for that row. */
  protected onDeleteRequested(event: { item: BookmarkListItem; opener: HTMLElement }): void {
    this.deleteConfirm().open(event.item, event.opener);
  }

  /**
   * F06-AC12, C-F06-03: the duplicate banner's "Edit existing" action. Pre-fills
   * from the enriched `duplicateUrlError()` details already held in
   * `store.duplicate()` — no new `GET` is issued (LD-03) — discarding whatever
   * was typed into the add attempt.
   *
   * F06-RV02: `title_source` is read from the response's `details` (added
   * server-side alongside `tags`/`updatedAt`) rather than assumed to be `'user'`,
   * so `beginEdit()`'s title-blank-to-refetch rule behaves identically to the
   * row-button edit path.
   */
  protected onEditExisting(existingId: number): void {
    const details = this.store.duplicate()?.details;
    if (!details) return;

    this.form().openEdit({
      id: existingId,
      url: details.url,
      title: details.title,
      title_source: details.title_source ?? 'user',
      created_at: '',
      updated_at: details.updatedAt ?? '',
      tags: details.tags ?? [],
    });
  }

  /**
   * F01-AC11/F03: the duplicate banner's "View existing" action. Resolved as a
   * clamp-and-highlight (hld.md section 7, A05) rather than a new route: close
   * the dialog, clear whatever tag filter is active and return to page 1, then
   * scroll to and flash the existing row once that page has loaded.
   */
  protected async onViewExisting(existingId: number): Promise<void> {
    this.form().close();
    this.store.tagFilter.set(null);
    this.store.page.set(1);
    await this.store.loadList();
    this.list().scrollToAndFlash(existingId);
  }
}
