import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { BookmarkList } from './bookmark-list';
import { BookmarksStore } from '../../state/bookmarks.store';
import type { BookmarkListItem } from '../../core/models';

const ITEM: BookmarkListItem = {
  id: 1,
  url: 'https://www.example.com/article',
  title: 'Example title',
  title_source: 'fetched',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  tags: [],
};

describe('BookmarkList', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<BookmarkList>>;
  let host: HTMLElement;
  let store: BookmarksStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookmarkList],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(BookmarkList);
    host = fixture.nativeElement as HTMLElement;
    store = TestBed.inject(BookmarksStore);
    // Most fixtures below are about a populated list; default allCount to a
    // non-zero value so F05-T09's all-empty branch (allCount() === 0) only
    // fires in the tests that explicitly set it to 0.
    store.allCount.set(1);
    fixture.detectChanges();
  });

  describe('F03-AC2 — the empty state', () => {
    it('renders the exact heading and copy, and an Add bookmark action', () => {
      store.items.set([]);
      store.total.set(0);
      store.allCount.set(0);
      fixture.detectChanges();

      expect(host.querySelector('h2')?.textContent).toBe('No bookmarks yet');
      expect(host.querySelector('.empty p')?.textContent).toBe(
        'Save your first link, then add a tag or two so it is easy to find later.',
      );

      const addButton = Array.from(host.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === 'Add bookmark',
      );
      expect(addButton).toBeDefined();

      let emitted = false;
      fixture.componentInstance.addRequested.subscribe(() => (emitted = true));
      addButton!.click();
      expect(emitted).toBe(true);
    });
  });

  describe('F03-AC11 — the error state', () => {
    it('renders the exact message and a working Retry', () => {
      store.listError.set('Something went wrong loading your bookmarks.');
      fixture.detectChanges();

      expect(host.querySelector('[role="alert"] p')?.textContent).toBe(
        'Something went wrong loading your bookmarks.',
      );

      const retryButton = Array.from(host.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === 'Retry',
      );
      expect(retryButton).toBeDefined();

      // Clicking Retry calls store.retryList(), which issues a real HTTP GET —
      // proving the click is wired without needing to inspect internals.
      const http = TestBed.inject(HttpTestingController);
      retryButton!.click();
      http
        .expectOne((r) => r.url === '/api/bookmarks')
        .flush({
          items: [],
          total: 0,
          page: 1,
          size: 20,
        });
    });
  });

  describe('F03-EC5 — a bookmark with zero tags', () => {
    it('renders no tag-chip container at all', () => {
      store.items.set([ITEM]);
      store.total.set(1);
      fixture.detectChanges();

      expect(host.querySelector('.tl')).toBeNull();
    });
  });

  describe('F04-AC2 — a bookmark with tags', () => {
    it('renders each tag as a button carrying the tag text and a Filter by tag aria-label', () => {
      store.items.set([{ ...ITEM, tags: ['reading', 'work'] }]);
      store.total.set(1);
      fixture.detectChanges();

      const chips = Array.from(host.querySelectorAll('.tl .chip'));
      expect(chips).toHaveLength(2);
      for (const chip of chips) {
        expect(chip.tagName).toBe('BUTTON');
      }
      expect(chips.map((c) => c.textContent?.trim())).toEqual(['reading', 'work']);
      expect(chips.map((c) => c.getAttribute('aria-label'))).toEqual([
        'Filter by tag reading',
        'Filter by tag work',
      ]);
    });

    it('activating a card tag chip calls store.selectTag with that tag', () => {
      store.items.set([{ ...ITEM, tags: ['reading', 'work'] }]);
      store.total.set(1);
      fixture.detectChanges();

      const chips = Array.from(host.querySelectorAll('.tl .chip'));
      (chips[1] as HTMLElement).click();

      expect(store.tagFilter()).toBe('work');
    });

    it('strips a leading www. from the host and bolds it', () => {
      store.items.set([ITEM]);
      store.total.set(1);
      fixture.detectChanges();

      expect(host.querySelector('.url b')?.textContent).toBe('example.com');
    });
  });

  describe('F04-AC2, AC4 — the active-filter chip', () => {
    it('is absent when no tag filter is active', () => {
      store.items.set([ITEM]);
      store.total.set(1);
      store.tagFilter.set(null);
      fixture.detectChanges();

      expect(host.querySelector('#af')).toBeNull();
    });

    it('renders "Tag: <name>" with a Clear tag filter control when a filter is active', () => {
      store.items.set([ITEM]);
      store.total.set(1);
      store.tagFilter.set('research');
      fixture.detectChanges();

      const chip = host.querySelector('#af .chip');
      expect(chip?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Tag: research ×');

      const clearButton = host.querySelector('#af button')!;
      expect(clearButton.getAttribute('aria-label')).toBe('Clear tag filter');
      clearButton.dispatchEvent(new Event('click'));

      expect(store.tagFilter()).toBeNull();
    });
  });

  describe('F04-AC9 — the tag-empty state (EC13)', () => {
    it("renders ahead of F03's own empty state when a tag filter has zero results", () => {
      store.items.set([]);
      store.total.set(0);
      store.tagFilter.set('design');
      fixture.detectChanges();

      expect(host.querySelector('h2')?.textContent).toBe('No bookmarks tagged "design"');
      expect(host.querySelector('.empty p')?.textContent).toBe(
        'Remove the filter to see everything you have saved.',
      );

      const clearButton = Array.from(host.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === 'Clear tag filter',
      );
      expect(clearButton).toBeDefined();
      clearButton!.dispatchEvent(new Event('click'));

      expect(store.tagFilter()).toBeNull();
    });
  });

  describe('F05-AC7, AC8, F05-EC3, F05-EC5, F05-EC6 — empty-state precedence and the search no-results state', () => {
    it('renders the all-empty state even when a search and a tag filter are both active (precedence)', () => {
      store.items.set([]);
      store.total.set(0);
      store.allCount.set(0);
      store.search.set('tomato');
      store.tagFilter.set('design');
      fixture.detectChanges();

      expect(host.querySelector('h2')?.textContent).toBe('No bookmarks yet');
    });

    it('renders the search no-results state ahead of the tag-empty state when both are active', () => {
      store.items.set([]);
      store.total.set(0);
      store.search.set('tomato');
      store.tagFilter.set('design');
      fixture.detectChanges();

      expect(host.querySelector('h2')?.textContent).toBe('No bookmarks match "tomato"');
    });

    it('renders only the primary Clear search action when no tag filter is active', () => {
      store.items.set([]);
      store.total.set(0);
      store.search.set('tomato');
      fixture.detectChanges();

      const buttons = Array.from(host.querySelectorAll('.empty button')).map((b) =>
        b.textContent?.trim(),
      );
      expect(buttons).toEqual(['Clear search']);
    });

    it('renders a secondary Clear tag filter action alongside Clear search when a tag filter is also active', () => {
      store.items.set([]);
      store.total.set(0);
      store.search.set('tomato');
      store.tagFilter.set('design');
      fixture.detectChanges();

      const buttons = Array.from(host.querySelectorAll('.empty button')).map((b) =>
        b.textContent?.trim(),
      );
      expect(buttons).toEqual(['Clear search', 'Clear tag filter']);
    });

    it('Clear search calls store.clearSearch()', () => {
      store.items.set([]);
      store.total.set(0);
      store.search.set('tomato');
      fixture.detectChanges();

      const http = TestBed.inject(HttpTestingController);
      const clearButton = Array.from(host.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === 'Clear search',
      )!;
      clearButton.click();

      expect(store.search()).toBe('');
      http
        .expectOne((r) => r.url === '/api/bookmarks')
        .flush({ items: [], total: 0, page: 1, size: 20 });
    });
  });

  describe('F03-AC8, F06-T09 — Edit/Delete buttons', () => {
    it('carries the correct aria-labels', () => {
      store.items.set([ITEM]);
      store.total.set(1);
      fixture.detectChanges();

      const edit = host.querySelector('.act:not(.del)');
      const del = host.querySelector('.act.del');
      expect(edit?.getAttribute('aria-label')).toBe('Edit Example title');
      expect(del?.getAttribute('aria-label')).toBe('Delete Example title');
    });

    it('clicking Delete emits deleteRequested with that row and the clicked element (F07-AC1)', () => {
      store.items.set([ITEM]);
      store.total.set(1);
      fixture.detectChanges();

      let emitted: { item: BookmarkListItem; opener: HTMLElement } | null = null;
      fixture.componentInstance.deleteRequested.subscribe((payload) => (emitted = payload));

      const del = host.querySelector('.act.del') as HTMLElement;
      del.click();

      expect(emitted).not.toBeNull();
      expect(emitted!.item).toEqual(ITEM);
      expect(emitted!.opener).toBe(del);
    });

    it('clicking Edit emits editRequested with that row and the clicked element', () => {
      store.items.set([ITEM]);
      store.total.set(1);
      fixture.detectChanges();

      let emitted: { item: BookmarkListItem; opener: HTMLElement } | null = null;
      fixture.componentInstance.editRequested.subscribe((payload) => (emitted = payload));

      const edit = host.querySelector('.act:not(.del)') as HTMLElement;
      edit.click();

      expect(emitted).not.toBeNull();
      expect(emitted!.item).toEqual(ITEM);
      expect(emitted!.opener).toBe(edit);
    });
  });

  describe('F03-AC1 — the count region', () => {
    it('is a polite live region reflecting countText()', () => {
      store.items.set([ITEM, { ...ITEM, id: 2 }, { ...ITEM, id: 3 }]);
      store.total.set(3);
      fixture.detectChanges();

      const count = host.querySelector('#count');
      expect(count?.getAttribute('aria-live')).toBe('polite');
      expect(count?.textContent).toBe('3 bookmarks');
    });
  });

  describe('F03-AC4, AC6, AC9, AC10 — the pagination control', () => {
    it('changing the page-size select calls changePageSize()', () => {
      store.items.set([ITEM]);
      store.total.set(25);
      store.page.set(2);
      store.size.set(10);
      fixture.detectChanges();

      const select = host.querySelector('.page-size select') as HTMLSelectElement;
      select.value = '20';
      select.dispatchEvent(new Event('change'));

      expect(store.page()).toBe(1);
      expect(store.size()).toBe(20);
    });

    it('disables Previous on page 1 and Next on the last page, keeping both present', () => {
      store.items.set([ITEM]);
      store.total.set(25);
      store.page.set(1);
      store.size.set(10);
      fixture.detectChanges();

      const buttons = Array.from(host.querySelectorAll('.pager button'));
      const previous = buttons.find((b) => b.textContent?.trim() === 'Previous');
      const next = buttons.find((b) => b.textContent?.trim() === 'Next');
      expect(previous).toBeDefined();
      expect(next).toBeDefined();
      expect((previous as HTMLButtonElement).disabled).toBe(true);
      expect((next as HTMLButtonElement).disabled).toBe(false);

      store.page.set(3);
      fixture.detectChanges();
      expect((previous as HTMLButtonElement).disabled).toBe(false);
      expect((next as HTMLButtonElement).disabled).toBe(true);
    });

    it('conveys the current page as text', () => {
      store.items.set([ITEM]);
      store.total.set(25);
      store.page.set(2);
      store.size.set(10);
      fixture.detectChanges();

      expect(host.querySelector('.page-text')?.textContent).toBe('Page 2 of 3');
    });

    it('disables the page-size select and both buttons while listLoading is true', () => {
      store.items.set([ITEM]);
      store.total.set(25);
      store.page.set(2);
      store.size.set(10);
      store.listLoading.set(true);
      fixture.detectChanges();

      const select = host.querySelector('.page-size select') as HTMLSelectElement;
      const buttons = Array.from(host.querySelectorAll('.pager button')) as HTMLButtonElement[];
      expect(select.disabled).toBe(true);
      for (const button of buttons) {
        expect(button.disabled).toBe(true);
      }
    });

    it('F03-RV01 — announces the current page as a live region, even when total is unchanged', () => {
      store.items.set([ITEM]);
      store.total.set(25);
      store.page.set(2);
      store.size.set(10);
      fixture.detectChanges();

      expect(host.querySelector('.page-text')?.getAttribute('aria-live')).toBe('polite');
    });
  });
});
