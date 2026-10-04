import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeleteConfirm } from './delete-confirm';
import { BookmarksStore } from '../../state/bookmarks.store';
import type { BookmarkListItem } from '../../core/models';

/**
 * F07-AC1, AC2, AC9, AC16. jsdom implements <dialog>, so open/close is
 * exercised for real, mirroring `BookmarkForm`'s spec.
 */
describe('DeleteConfirm', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<DeleteConfirm>>;
  let host: HTMLElement;
  let component: DeleteConfirm;
  let store: BookmarksStore;

  const ITEM: BookmarkListItem = {
    id: 1,
    url: 'https://example.com/x',
    title: 'Example title',
    title_source: 'fetched',
    created_at: '2025-01-15T10:30:00.000Z',
    updated_at: '2025-01-15T10:30:00.000Z',
    tags: [],
  };

  function dialog(): HTMLDialogElement {
    return host.querySelector('dialog')!;
  }

  function cancelButton(): HTMLButtonElement {
    return host.querySelector('.row .btn:not(.bad)')!;
  }

  function deleteButton(): HTMLButtonElement {
    return host.querySelector('.row .btn.bad')!;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeleteConfirm],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(DeleteConfirm);
    component = fixture.componentInstance;
    host = fixture.nativeElement as HTMLElement;
    store = TestBed.inject(BookmarksStore);
    fixture.detectChanges();
  });

  it('F07-AC1 — opens as a modal naming the given bookmark, focused on Cancel', () => {
    expect(dialog().open).toBe(false);

    component.open(ITEM);
    fixture.detectChanges();

    expect(dialog().open).toBe(true);
    expect(host.querySelector('.prev b')!.textContent).toBe(ITEM.title);
    expect(host.querySelector('.prev span')!.textContent).toBe(ITEM.url);
    expect(document.activeElement).toBe(cancelButton());
  });

  it('F07-AC2 — Cancel closes the dialog and returns focus to the opener', () => {
    const opener = document.createElement('button');
    document.body.append(opener);

    component.open(ITEM, opener);
    fixture.detectChanges();
    component.close();
    fixture.detectChanges();

    expect(dialog().open).toBe(false);
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it('F07-AC2 — Esc (the native close event) returns focus to the opener the same way', () => {
    const opener = document.createElement('button');
    document.body.append(opener);

    component.open(ITEM, opener);
    fixture.detectChanges();
    dialog().dispatchEvent(new Event('close'));
    fixture.detectChanges();

    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it('F07-AC1, AC9 — Confirm disables the Delete button and calls store.deleteBookmark(item)', () => {
    const spy = vi.spyOn(store, 'deleteBookmark').mockResolvedValue(undefined);
    component.open(ITEM);
    fixture.detectChanges();

    deleteButton().click();
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith(ITEM);
    expect(deleteButton().disabled).toBe(true);
  });

  it('a second rapid click on Delete does not call store.deleteBookmark twice (F07-EC1)', () => {
    const spy = vi.spyOn(store, 'deleteBookmark').mockResolvedValue(undefined);
    component.open(ITEM);
    fixture.detectChanges();

    deleteButton().click();
    deleteButton().click();
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
