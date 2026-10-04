import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchBox } from './search-box';
import { BookmarksStore } from '../../state/bookmarks.store';

/**
 * F05-AC9, AC12, AC13. Mirrors `TagInput`'s spec shape — the debounced write
 * is exercised with fake timers, and every store call surfaces as an HTTP
 * request through `HttpTestingController`.
 */
describe('SearchBox', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<SearchBox>>;
  let host: HTMLElement;
  let http: HttpTestingController;

  function searchInput(): HTMLInputElement {
    return host.querySelector('#q')!;
  }

  function type(value: string): void {
    const input = searchInput();
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function clearButton(): HTMLButtonElement | null {
    return host.querySelector('.cl');
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchBox],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(SearchBox);
    host = fixture.nativeElement as HTMLElement;
    TestBed.inject(BookmarksStore);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
  });

  it('labels the input and marks the icon decorative', () => {
    const label = host.querySelector('label[for="q"]');
    expect(label).not.toBeNull();
    expect(label?.textContent).toContain('Search bookmarks');
  });

  it('does not render the clear button while the field is empty', () => {
    expect(clearButton()).toBeNull();
  });

  it('shows the clear button immediately on input, ahead of the debounce', () => {
    type('tomato');
    expect(clearButton()).not.toBeNull();
  });

  describe('debounced search (F05-AC13)', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('waits 250ms after typing before calling setSearchText', async () => {
      type('tomato');

      vi.advanceTimersByTime(249);
      http.expectNone((r) => r.url === '/api/bookmarks' && r.params.get('q') === 'tomato');

      vi.advanceTimersByTime(1);
      http
        .expectOne('/api/bookmarks?page=1&size=20&q=tomato')
        .flush({ items: [], total: 0, page: 1, size: 20 });
      await Promise.resolve();
      await Promise.resolve();
      http.expectOne('/api/tags').flush([]);
      http.expectOne('/api/bookmarks/count').flush({ total: 0 });
    });

    it('only fires once for a burst of keystrokes within the debounce window', async () => {
      type('t');
      vi.advanceTimersByTime(100);
      type('to');
      vi.advanceTimersByTime(100);
      type('tom');

      vi.advanceTimersByTime(250);
      http
        .expectOne('/api/bookmarks?page=1&size=20&q=tom')
        .flush({ items: [], total: 0, page: 1, size: 20 });
      await Promise.resolve();
      await Promise.resolve();
      http.expectOne('/api/tags').flush([]);
      http.expectOne('/api/bookmarks/count').flush({ total: 0 });
    });
  });

  it('clearing cancels any pending debounce, empties the field, and reloads unfiltered', async () => {
    vi.useFakeTimers();
    type('tomato');

    clearButton()!.click();
    fixture.detectChanges();

    expect(searchInput().value).toBe('');
    expect(clearButton()).toBeNull();

    // The debounced write never fires — only the immediate clearSearch() request does.
    http
      .expectOne('/api/bookmarks?page=1&size=20')
      .flush({ items: [], total: 0, page: 1, size: 20 });
    await Promise.resolve();
    await Promise.resolve();
    http.expectOne('/api/tags').flush([]);
    http.expectOne('/api/bookmarks/count').flush({ total: 0 });

    vi.advanceTimersByTime(250);
    http.expectNone((r) => r.url === '/api/bookmarks' && r.params.get('q') === 'tomato');
    vi.useRealTimers();
  });

  it('returns focus to the input after clearing', async () => {
    type('tomato');
    clearButton()!.click();
    fixture.detectChanges();

    http
      .expectOne('/api/bookmarks?page=1&size=20')
      .flush({ items: [], total: 0, page: 1, size: 20 });
    await Promise.resolve();
    await Promise.resolve();
    http.expectOne('/api/tags').flush([]);
    http.expectOne('/api/bookmarks/count').flush({ total: 0 });

    expect(document.activeElement).toBe(searchInput());
  });
});
