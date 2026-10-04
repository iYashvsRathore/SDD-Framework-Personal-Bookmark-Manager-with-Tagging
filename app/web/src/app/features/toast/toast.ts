import { Component, computed, inject, signal } from '@angular/core';
import { BookmarksStore } from '../../state/bookmarks.store';

/**
 * The polite live region (F01-AC3, F01-AC5).
 *
 * The container is rendered unconditionally and only its text changes. Inserting
 * an element that already contains its text is not reliably announced by screen
 * readers, so the region has to exist from first paint for the very first message
 * to be heard.
 */
@Component({
  selector: 'app-toast',
  templateUrl: './toast.html',
})
export class Toast {
  protected readonly store = inject(BookmarksStore);

  /**
   * F07-AC4, EC1: the undo handler already acted on, so a second click on the
   * same toast is a no-op. Comparing by reference (not a boolean) means a
   * *new* toast's undo handler is automatically re-enabled — no reset step
   * needed, since a fresh handler can never equal the one already handled.
   */
  private readonly handledUndo = signal<(() => void) | null>(null);
  protected readonly undoDisabled = computed(() => this.handledUndo() === this.store.toastUndo());

  protected onUndo(): void {
    const undo = this.store.toastUndo();
    if (!undo || this.undoDisabled()) return;

    this.handledUndo.set(undo);
    undo();
  }
}
