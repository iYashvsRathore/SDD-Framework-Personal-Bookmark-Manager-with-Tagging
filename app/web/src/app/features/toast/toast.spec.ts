import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { Toast } from './toast';
import { BookmarksStore } from '../../state/bookmarks.store';

/** F07-AC4, AC16: the toast's Undo action. */
describe('Toast', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Toast>>;
  let host: HTMLElement;
  let store: BookmarksStore;

  function undoButton(): HTMLButtonElement | null {
    return host.querySelector('.toast button');
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Toast],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(Toast);
    host = fixture.nativeElement as HTMLElement;
    store = TestBed.inject(BookmarksStore);
    fixture.detectChanges();
  });

  it('renders no Undo button for a plain toast (no undo handler)', () => {
    store.toast.set('Bookmark saved');
    fixture.detectChanges();

    expect(host.querySelector('.toast')!.textContent).toContain('Bookmark saved');
    expect(undoButton()).toBeNull();
  });

  it('renders a real <button> Undo when toastUndo() is set', () => {
    store.toast.set('Bookmark deleted');
    store.toastUndo.set(() => undefined);
    fixture.detectChanges();

    const button = undoButton();
    expect(button).not.toBeNull();
    expect(button!.tagName).toBe('BUTTON');
  });

  it('clicking Undo calls the handler and disables the button immediately', () => {
    let called = 0;
    store.toast.set('Bookmark deleted');
    store.toastUndo.set(() => {
      called += 1;
    });
    fixture.detectChanges();

    undoButton()!.click();
    fixture.detectChanges();

    expect(called).toBe(1);
    expect(undoButton()!.disabled).toBe(true);
  });

  it('a second click before the toast changes does not call the handler again', () => {
    let called = 0;
    store.toast.set('Bookmark deleted');
    store.toastUndo.set(() => {
      called += 1;
    });
    fixture.detectChanges();

    undoButton()!.click();
    undoButton()!.click();
    fixture.detectChanges();

    expect(called).toBe(1);
  });

  it('a fresh toast with a new undo handler re-enables the button', () => {
    store.toast.set('Bookmark deleted');
    store.toastUndo.set(() => undefined);
    fixture.detectChanges();
    undoButton()!.click();
    fixture.detectChanges();
    expect(undoButton()!.disabled).toBe(true);

    store.toast.set('Bookmark deleted');
    store.toastUndo.set(() => undefined);
    fixture.detectChanges();

    expect(undoButton()!.disabled).toBe(false);
  });
});
