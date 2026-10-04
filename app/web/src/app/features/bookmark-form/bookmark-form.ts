import { Component, ElementRef, inject, output, viewChild, type OnDestroy } from '@angular/core';
import { BookmarksStore } from '../../state/bookmarks.store';
import type { BookmarkListItem, CreateBookmarkRequest } from '../../core/models';
import { TagInput } from '../tag-input/tag-input';

/**
 * The add-bookmark dialog (F01-AC7, AC8, AC10, AC17).
 *
 * Built on the native `<dialog>` with `showModal()`. That is deliberate: the
 * platform already gives a modal focus trap, inertness of the page behind, and
 * `Esc` to dismiss. A hand-rolled trap would be more code AND less correct, and
 * `showModal()` restores focus to the element that opened it, which is exactly
 * what F01-AC17 asks for.
 */
@Component({
  selector: 'app-bookmark-form',
  templateUrl: './bookmark-form.html',
  imports: [TagInput],
})
export class BookmarkForm implements OnDestroy {
  protected readonly store = inject(BookmarksStore);

  /** Emitted with a validated payload. The HTTP call is wired by the parent. */
  readonly submitted = output<CreateBookmarkRequest>();
  readonly closed = output<void>();

  /**
   * The duplicate banner's two actions (F01-AC11). F01 specifies only that they
   * exist and are operable; where they lead is F03's and F06's acceptance
   * criteria, so the ids are handed to the parent and nothing is invented here.
   */
  readonly viewExisting = output<number>();
  readonly editExisting = output<number>();

  private readonly dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly urlRef = viewChild.required<ElementRef<HTMLInputElement>>('urlInput');
  private readonly titleRef = viewChild.required<ElementRef<HTMLInputElement>>('titleInput');
  private readonly tagInputRef = viewChild.required(TagInput);

  /** The element to restore focus to. Captured because the dialog may outlive it. */
  private opener: HTMLElement | null = null;

  open(opener: HTMLElement | null = null): void {
    this.opener = opener ?? (document.activeElement as HTMLElement | null);
    this.store.reset();

    const dialog = this.dialogRef().nativeElement;
    if (!dialog.open) dialog.showModal();

    // Focus the first field rather than letting the browser pick, so the user
    // starts where the task starts.
    this.urlRef().nativeElement.focus();
  }

  /**
   * F06: the edit entry point — mirrors `open()`, but pre-fills from an
   * already-held row (LD-03) and marks the save that follows as an edit.
   */
  openEdit(bookmark: BookmarkListItem, opener: HTMLElement | null = null): void {
    this.opener = opener ?? (document.activeElement as HTMLElement | null);
    this.store.beginEdit(bookmark);

    const dialog = this.dialogRef().nativeElement;
    if (!dialog.open) dialog.showModal();

    this.urlRef().nativeElement.focus();
  }

  close(): void {
    const dialog = this.dialogRef().nativeElement;
    if (dialog.open) dialog.close();
  }

  /** F06-AC11: the conflict banner's Reload button — refreshes the list and gives up on this edit. */
  protected onReload(): void {
    this.store.retryList();
    this.close();
  }

  /**
   * Fired by the native `close` event, so `Esc` and the Cancel button follow one
   * path. Restoring focus explicitly rather than relying on the browser keeps the
   * behaviour identical when the dialog is closed programmatically after a save.
   */
  protected onDialogClose(): void {
    this.store.clearMessages();
    this.opener?.focus();
    this.closed.emit();
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    if (!this.store.canSubmit()) return;

    this.store.duplicate.set(null);

    const invalidField = this.store.validate();
    if (invalidField) {
      // Focus follows the error, so a screen reader user is taken to the problem
      // instead of having to hunt for it (F01-AC7, F01-AC8).
      const target = invalidField === 'url' ? this.urlRef() : this.titleRef();
      target.nativeElement.focus();
      return;
    }

    // F02-RV01: commit any text still sitting uncommitted in the tag input
    // (not yet Enter-ed/comma-ed), mirroring `docs/mockup.html`'s submit handler
    // (`if(tg.value.trim())addTag(...)`) — otherwise it is silently lost.
    this.tagInputRef().commitPendingText();

    const title = this.store.userTitle().trim();
    const tags = this.store.tags();
    this.submitted.emit({
      url: this.store.url().trim(),
      ...(title === '' ? {} : { title }),
      ...(tags.length === 0 ? {} : { tags }),
    });
  }

  ngOnDestroy(): void {
    this.opener = null;
  }
}
