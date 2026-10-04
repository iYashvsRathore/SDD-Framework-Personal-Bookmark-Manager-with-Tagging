import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TagInput } from './tag-input';
import { BookmarksStore } from '../../state/bookmarks.store';

/**
 * F02-AC10, AC11, AC12, AC13. `BookmarksStore` is provided through Angular DI,
 * the same pattern `BookmarkForm`'s spec uses — chip commit never reaches the
 * network, so most of this is assertable without an HTTP call.
 */
describe('TagInput', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<TagInput>>;
  let host: HTMLElement;
  let component: TagInput;
  let store: BookmarksStore;
  let http: HttpTestingController;

  function tagInput(): HTMLInputElement {
    return host.querySelector('#tg')!;
  }

  function setValue(value: string): void {
    tagInput().value = value;
  }

  function type(value: string): void {
    const input = tagInput();
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  /** Simulates choosing a `<datalist>` option (F02-RV02): the browser fires
   * `input` with `inputType: 'insertReplacementText'`, distinct from typing. */
  function pickDatalistOption(value: string): void {
    const input = tagInput();
    input.value = value;
    input.dispatchEvent(new InputEvent('input', { inputType: 'insertReplacementText' }));
    fixture.detectChanges();
  }

  function keydown(key: string): void {
    tagInput().dispatchEvent(new KeyboardEvent('keydown', { key, cancelable: true }));
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TagInput],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(TagInput);
    host = fixture.nativeElement as HTMLElement;
    component = fixture.componentInstance;
    store = TestBed.inject(BookmarksStore);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
  });

  it('labels the input and places it in DOM order after any existing chips', () => {
    store.addTagsFromText('urgent,docs');
    fixture.detectChanges();

    const label = host.querySelector('label[for="tg"]');
    expect(label).not.toBeNull();

    const chips = Array.from(host.querySelectorAll('.chip'));
    const input = tagInput();
    const all = Array.from(host.querySelectorAll('.chip, #tg'));

    // Every chip appears before the input in document order (AC10).
    expect(all.indexOf(input)).toBe(chips.length);
  });

  it('commits the typed text as a chip on Enter and clears the input', () => {
    setValue('research');
    keydown('Enter');

    expect(store.tags()).toEqual(['research']);
    expect(tagInput().value).toBe('');
  });

  it('commits the typed text as a chip on comma', () => {
    setValue('research');
    keydown(',');

    expect(store.tags()).toEqual(['research']);
  });

  it('removes the last chip on Backspace against an empty input, keeping focus', () => {
    store.addTagsFromText('urgent,docs');
    fixture.detectChanges();

    tagInput().focus();
    // Real focus also fires the component's own (focus) handler (AC12) — not
    // under test here, so it is consumed immediately.
    http.expectOne('/api/tags?prefix=').flush([]);

    keydown('Backspace');

    expect(store.tags()).toEqual(['urgent']);
    expect(document.activeElement).toBe(tagInput());
  });

  it('does nothing on Backspace when the input already has text', () => {
    store.addTagsFromText('urgent,docs');
    setValue('x');
    keydown('Backspace');

    expect(store.tags()).toEqual(['urgent', 'docs']);
  });

  it("exposes each chip's remove button with the exact accessible name", () => {
    store.addTagsFromText('urgent,docs');
    fixture.detectChanges();

    const buttons = Array.from(host.querySelectorAll<HTMLButtonElement>('.chip button'));
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual([
      'Remove tag urgent',
      'Remove tag docs',
    ]);
  });

  it('fetching focus triggers one immediate loadTagSuggestions call', () => {
    tagInput().dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    const request = http.expectOne('/api/tags?prefix=');
    request.flush([]);
  });

  describe('debounced suggestion fetch (AC12)', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('waits 250ms after typing before fetching suggestions', () => {
      type('d');

      vi.advanceTimersByTime(249);
      http.expectNone('/api/tags?prefix=d');

      vi.advanceTimersByTime(1);
      const request = http.expectOne('/api/tags?prefix=d');
      request.flush(['docs']);
    });

    it('only fetches once for a burst of keystrokes within the debounce window', () => {
      type('d');
      vi.advanceTimersByTime(100);
      type('do');
      vi.advanceTimersByTime(100);
      type('doc');

      vi.advanceTimersByTime(250);
      const request = http.expectOne('/api/tags?prefix=doc');
      request.flush(['docs']);
    });
  });

  it('selecting a datalist option commits it as a chip through addTagChip (F02-RV02)', () => {
    store.tagSuggestions.set(['docs']);
    fixture.detectChanges();

    pickDatalistOption('docs');

    expect(store.tags()).toEqual(['docs']);
    expect(tagInput().value).toBe('');
  });

  it('typing through a shorter existing suggestion does not auto-commit it (F02-RV02)', () => {
    store.tagSuggestions.set(['doc']);
    fixture.detectChanges();

    // Typing "doc" on the way to "document" exactly matches a suggestion, but
    // this is a real keystroke (inputType 'insertText'), not a datalist pick.
    type('doc');

    expect(store.tags()).toEqual([]);
    expect(tagInput().value).toBe('doc');
  });

  it('commits text still sitting in the input on commitPendingText (F02-RV01)', () => {
    setValue('research');

    component.commitPendingText();

    expect(store.tags()).toEqual(['research']);
    expect(tagInput().value).toBe('');
  });

  it('commitPendingText is a no-op when the input is empty (F02-RV01)', () => {
    component.commitPendingText();

    expect(store.tags()).toEqual([]);
  });

  it('associates the error message with the input via aria-describedby/aria-invalid (F02-RV03)', () => {
    expect(tagInput().getAttribute('aria-describedby')).toBe('tgerr');
    expect(host.querySelector('#tgerr')).not.toBeNull();
    expect(tagInput().getAttribute('aria-invalid')).toBeNull();

    store.tagsError.set('Tags can be up to 24 characters.');
    fixture.detectChanges();

    expect(tagInput().getAttribute('aria-invalid')).toBe('true');
    expect(host.querySelector('#tgerr')!.textContent!.trim()).toBe(
      'Tags can be up to 24 characters.',
    );
  });

  it('a pasted comma-separated value commits every part immediately', () => {
    type('urgent,docs');

    expect(store.tags()).toEqual(['urgent', 'docs']);
    expect(tagInput().value).toBe('');
  });
});
