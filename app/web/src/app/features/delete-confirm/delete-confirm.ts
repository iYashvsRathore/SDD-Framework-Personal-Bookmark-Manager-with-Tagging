import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { BookmarksStore } from '../../state/bookmarks.store';
import type { BookmarkListItem } from '../../core/models';

/**
 * The delete confirmation dialog (F07-AC1, AC2, AC9, AC16).
 *
 * Built on the native `<dialog>` with `showModal()`, the same choice
 * `BookmarkForm` already made and for the same reasons: the platform supplies
 * the modal focus trap, page inertness, and `Esc`-to-dismiss for free.
 */
@Component({
  selector: 'app-delete-confirm',
  templateUrl: './delete-confirm.html',
})
export class DeleteConfirm {
  protected readonly store = inject(BookmarksStore);

  private readonly dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly cancelRef = viewChild.required<ElementRef<HTMLButtonElement>>('cancelButton');

  /** The row this confirmation is for, so the dialog can name it and the Confirm handler can act on it. */
  protected readonly pending = signal<BookmarkListItem | null>(null);

  /**
   * F07-AC9, EC1: disables the Delete button after the first click, so a
   * second rapid activation cannot issue a second request while the first is
   * still in flight.
   */
  protected readonly confirming = signal(false);

  /** The element to restore focus to once the dialog closes. */
  private opener: HTMLElement | null = null;

  /** F07-AC1: opens the dialog naming `item`, with focus on Cancel, not Delete. */
  open(item: BookmarkListItem, opener: HTMLElement | null = null): void {
    this.opener = opener ?? (document.activeElement as HTMLElement | null);
    this.pending.set(item);
    this.confirming.set(false);

    const dialog = this.dialogRef().nativeElement;
    if (!dialog.open) dialog.showModal();

    // Explicit focus, not an HTML `autofocus` attribute - the same style
    // `BookmarkForm.open()` uses, so Cancel (not Delete) is where the user lands.
    this.cancelRef().nativeElement.focus();
  }

  close(): void {
    const dialog = this.dialogRef().nativeElement;
    if (dialog.open) dialog.close();
  }

  /**
   * Fired by the native `close` event, so `Esc` and the Cancel button follow
   * one path (F07-AC2) and so does a programmatic close after Confirm.
   */
  protected onDialogClose(): void {
    this.opener?.focus();
    this.opener = null;
    this.pending.set(null);
  }

  protected onConfirm(): void {
    const item = this.pending();
    if (!item || this.confirming()) return;

    this.confirming.set(true);
    this.close();
    void this.store.deleteBookmark(item);
  }
}
