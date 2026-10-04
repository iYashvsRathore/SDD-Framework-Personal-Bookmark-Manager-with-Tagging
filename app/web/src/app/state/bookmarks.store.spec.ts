import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BookmarksStore,
  CHANGES_SAVED_TOAST,
  DELETED_TOAST,
  SAVED_TOAST,
  TITLE_FALLBACK_NOTICE,
} from './bookmarks.store';
import { FALLBACK_MESSAGE, OFFLINE_MESSAGE } from '../core/api-error';
import type { Bookmark, BookmarkListItem } from '../core/models';

const SAVED: Bookmark = {
  id: 1,
  url: 'https://example.com/x',
  title: 'Example title',
  title_source: 'fetched',
  created_at: '2025-01-15T10:30:00.000Z',
  updated_at: '2025-01-15T10:30:00.000Z',
};

describe('BookmarksStore.save', () => {
  let store: BookmarksStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(BookmarksStore);
    http = TestBed.inject(HttpTestingController);
  });

  it('posts to the relative API path, never an absolute origin', async () => {
    const pending = store.save({ url: 'https://example.com/x' });

    const request = http.expectOne('/api/bookmarks');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ url: 'https://example.com/x' });

    request.flush({ bookmark: SAVED });
    await pending;
    http.expectOne((r) => r.method === 'GET').flush({ items: [], total: 0, page: 1, size: 20 });
    http.verify();
  });

  describe('F01-AC3 — the wait is explained', () => {
    it('shows the busy note while the server fetches a title', async () => {
      const pending = store.save({ url: 'https://example.com/x' });

      expect(store.submitting()).toBe(true);
      expect(store.busyNote()).toBe('Fetching title...');
      // The submit button is driven off canSubmit, so it is disabled in flight.
      expect(store.canSubmit()).toBe(false);

      http.expectOne('/api/bookmarks').flush({ bookmark: SAVED });
      await pending;

      expect(store.busyNote()).toBe('');
      expect(store.submitting()).toBe(false);
      expect(store.canSubmit()).toBe(true);
    });

    it('does not claim to be fetching when the user supplied a title', async () => {
      const pending = store.save({ url: 'https://example.com/x', title: 'Mine' });

      expect(store.busyNote()).toBe('');

      http.expectOne('/api/bookmarks').flush({ bookmark: SAVED });
      await pending;
    });
  });

  describe('a successful save', () => {
    it('reports success and refreshes the list instead of splicing locally', async () => {
      const pending = store.save({ url: 'https://example.com/x' });
      http.expectOne('/api/bookmarks').flush({ bookmark: SAVED });

      await expect(pending).resolves.toBe(true);
      expect(store.toast()).toBe('Bookmark saved');

      http
        .expectOne((r) => r.url === '/api/bookmarks' && r.method === 'GET')
        .flush({ items: [{ ...SAVED, tags: [] }], total: 1, page: 1, size: 20 });
      await Promise.resolve();

      expect(store.items()).toEqual([{ ...SAVED, tags: [] }]);
      expect(store.total()).toBe(1);
    });
  });

  describe('F01-AC5 — the title fell back to the hostname', () => {
    async function saveWith(title_source: string) {
      const pending = store.save({ url: 'https://www.example.com/x' });
      http
        .expectOne('/api/bookmarks')
        .flush({ bookmark: { ...SAVED, title: 'example.com', title_source } });
      return pending;
    }

    it('is still a success, not an error', async () => {
      await expect(saveWith('hostname')).resolves.toBe(true);
      expect(store.urlError()).toBe('');
      expect(store.duplicate()).toBeNull();
    });

    it('announces the exact notice in place of the plain confirmation', async () => {
      await saveWith('hostname');

      expect(store.toast()).toBe(
        "Couldn't fetch the title, so we used the domain instead. You can edit it anytime.",
      );
      expect(store.toast()).toBe(TITLE_FALLBACK_NOTICE);
    });

    it('keeps the plain confirmation when the fetch worked', async () => {
      await saveWith('fetched');
      expect(store.toast()).toBe(SAVED_TOAST);
    });

    it('keeps the plain confirmation when the user named it themselves', async () => {
      await saveWith('user');
      expect(store.toast()).toBe(SAVED_TOAST);
    });
  });

  describe('failures leave the dialog usable', () => {
    it('routes a 409 to the duplicate banner, not the field error', async () => {
      const pending = store.save({ url: 'https://example.com/x' });
      http.expectOne('/api/bookmarks').flush(
        {
          error: {
            code: 'DUPLICATE_URL',
            message: 'You already saved this address.',
            field: 'url',
            existingId: 7,
            details: { title: 'First save', url: 'https://example.com/x' },
          },
        },
        { status: 409, statusText: 'Conflict' },
      );

      await expect(pending).resolves.toBe(false);
      expect(store.duplicate()?.existingId).toBe(7);
      expect(store.urlError()).toBe('');
    });

    it('shows a 400 message against the field', async () => {
      const pending = store.save({ url: 'nonsense' });
      http.expectOne('/api/bookmarks').flush(
        {
          error: {
            code: 'INVALID_URL',
            message: 'Enter a web address starting with http:// or https://.',
            field: 'url',
          },
        },
        { status: 400, statusText: 'Bad Request' },
      );

      await expect(pending).resolves.toBe(false);
      expect(store.urlError()).toBe('Enter a web address starting with http:// or https://.');
    });

    it('routes a field:"title" 400 to titleError, not urlError (F01-RV03)', async () => {
      const pending = store.save({ url: 'https://example.com/x', title: 'x'.repeat(141) });
      http.expectOne('/api/bookmarks').flush(
        {
          error: {
            code: 'INVALID_URL',
            message: 'Title must be 140 characters or fewer.',
            field: 'title',
          },
        },
        { status: 400, statusText: 'Bad Request' },
      );

      await expect(pending).resolves.toBe(false);
      expect(store.titleError()).toBe('Title must be 140 characters or fewer.');
      expect(store.urlError()).toBe('');
    });

    it('falls back to an honest message when the error shape is unrecognised', async () => {
      const pending = store.save({ url: 'https://example.com/x' });
      http
        .expectOne('/api/bookmarks')
        .flush('<html>gateway error</html>', { status: 502, statusText: 'Bad Gateway' });

      await expect(pending).resolves.toBe(false);
      expect(store.urlError()).toBe(FALLBACK_MESSAGE);
    });

    it('says the server is unreachable when the request never lands', async () => {
      const pending = store.save({ url: 'https://example.com/x' });
      http.expectOne('/api/bookmarks').error(new ProgressEvent('error'), { status: 0 });

      await expect(pending).resolves.toBe(false);
      expect(store.urlError()).toBe(OFFLINE_MESSAGE);
    });

    it('always clears the in-flight state, whatever failed', async () => {
      const pending = store.save({ url: 'https://example.com/x' });
      http.expectOne('/api/bookmarks').flush(null, { status: 500, statusText: 'Server Error' });
      await pending;

      expect(store.submitting()).toBe(false);
      expect(store.busyNote()).toBe('');
      expect(store.canSubmit()).toBe(true);
    });

    it('does not raise a toast when the save failed', async () => {
      const pending = store.save({ url: 'https://example.com/x' });
      http.expectOne('/api/bookmarks').flush(null, { status: 500, statusText: 'Server Error' });
      await pending;

      expect(store.toast()).toBe('');
    });
  });
});

describe('BookmarksStore — F06 edit flow', () => {
  let store: BookmarksStore;
  let http: HttpTestingController;

  const EXISTING: BookmarkListItem = {
    ...SAVED,
    title: 'Original title',
    title_source: 'user',
    tags: ['design'],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(BookmarksStore);
    http = TestBed.inject(HttpTestingController);
  });

  it('beginEdit() pre-fills the form fields and sets editing()', () => {
    store.beginEdit(EXISTING);

    expect(store.url()).toBe(EXISTING.url);
    expect(store.userTitle()).toBe('Original title');
    expect(store.tags()).toEqual(['design']);
    expect(store.editing()).toEqual({ id: EXISTING.id, updatedAt: EXISTING.updated_at });
  });

  it('save() calls PUT, not POST, once editing() is set', async () => {
    store.beginEdit(EXISTING);

    const pending = store.save({ url: 'https://example.com/edited' });
    const request = http.expectOne(`/api/bookmarks/${EXISTING.id}`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      url: 'https://example.com/edited',
      updatedAt: EXISTING.updated_at,
    });

    request.flush({ bookmark: { ...SAVED, url: 'https://example.com/edited' } });
    await pending;
    http.expectOne((r) => r.method === 'GET').flush({ items: [], total: 0, page: 1, size: 20 });
  });

  it('a successful edit toasts "Changes saved", not "Bookmark saved"', async () => {
    store.beginEdit(EXISTING);

    const pending = store.save({ url: 'https://example.com/edited' });
    http.expectOne(`/api/bookmarks/${EXISTING.id}`).flush({ bookmark: SAVED });
    await pending;

    expect(store.toast()).toBe(CHANGES_SAVED_TOAST);
    http.expectOne((r) => r.method === 'GET').flush({ items: [], total: 0, page: 1, size: 20 });
  });

  it('routes a 404 NOT_FOUND to editBannerError, not urlError (F06-AC10)', async () => {
    store.beginEdit(EXISTING);

    const pending = store.save({ url: 'https://example.com/edited' });
    http
      .expectOne(`/api/bookmarks/${EXISTING.id}`)
      .flush(
        { error: { code: 'NOT_FOUND', message: 'That bookmark is no longer here.' } },
        { status: 404, statusText: 'Not Found' },
      );

    await expect(pending).resolves.toBe(false);
    expect(store.editBannerError()?.code).toBe('NOT_FOUND');
    expect(store.urlError()).toBe('');
  });

  it('routes a 409 EDIT_CONFLICT to editBannerError (F06-AC11)', async () => {
    store.beginEdit(EXISTING);
    const message =
      'This bookmark changed in another tab. Reload to see the latest, then try again.';

    const pending = store.save({ url: 'https://example.com/edited' });
    http
      .expectOne(`/api/bookmarks/${EXISTING.id}`)
      .flush(
        { error: { code: 'EDIT_CONFLICT', message } },
        { status: 409, statusText: 'Conflict' },
      );

    await expect(pending).resolves.toBe(false);
    expect(store.editBannerError()).toEqual({ code: 'EDIT_CONFLICT', message });
    expect(store.duplicate()).toBeNull();
  });

  it('reset() clears editing() and editBannerError()', () => {
    store.beginEdit(EXISTING);
    store.editBannerError.set({ code: 'NOT_FOUND', message: 'x' });

    store.reset();

    expect(store.editing()).toBeNull();
    expect(store.editBannerError()).toBeNull();
  });
});

describe('BookmarksStore — list state (F03-T05)', () => {
  let store: BookmarksStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(BookmarksStore);
    http = TestBed.inject(HttpTestingController);
  });

  it('countText() reads the F03-AC12 singular/plural rule off total', async () => {
    const pending = store.loadList();
    http
      .expectOne('/api/bookmarks?page=1&size=20')
      .flush({ items: [], total: 1, page: 1, size: 20 });
    await pending;
    expect(store.countText()).toBe('1 bookmark');

    const pending2 = store.loadList();
    http
      .expectOne('/api/bookmarks?page=1&size=20')
      .flush({ items: [], total: 3, page: 1, size: 20 });
    await pending2;
    expect(store.countText()).toBe('3 bookmarks');
  });

  it('changePageSize() resets page to 1 before calling the API (F03-AC4)', () => {
    store.page.set(4);
    store.changePageSize(50);

    expect(store.page()).toBe(1);
    const request = http.expectOne((r) => r.url === '/api/bookmarks');
    expect(request.request.params.get('page')).toBe('1');
    expect(request.request.params.get('size')).toBe('50');
    request.flush({ items: [], total: 0, page: 1, size: 50 });
  });

  it('keeps only the later of two out-of-order responses (LD-04)', async () => {
    const first = store.loadList();
    const firstRequest = http.expectOne('/api/bookmarks?page=1&size=20');

    store.page.set(2);
    const second = store.loadList();
    const secondRequest = http.expectOne('/api/bookmarks?page=2&size=20');

    // The later call's response arrives first; the earlier call's response,
    // arriving after, must not overwrite it.
    secondRequest.flush({ items: [{ ...SAVED, tags: [] }], total: 1, page: 2, size: 20 });
    await second;
    firstRequest.flush({ items: [], total: 0, page: 1, size: 20 });
    await first;

    expect(store.items()).toEqual([{ ...SAVED, tags: [] }]);
    expect(store.page()).toBe(2);
  });

  it('listLoading() is true only while a request is in flight', async () => {
    expect(store.listLoading()).toBe(false);
    const pending = store.loadList();
    expect(store.listLoading()).toBe(true);

    http
      .expectOne('/api/bookmarks?page=1&size=20')
      .flush({ items: [], total: 0, page: 1, size: 20 });
    await pending;

    expect(store.listLoading()).toBe(false);
  });

  it('sets the fixed F03-AC11 message on any failure, never the underlying cause', async () => {
    const pending = store.loadList();
    http
      .expectOne('/api/bookmarks?page=1&size=20')
      .flush(null, { status: 500, statusText: 'Server Error' });
    await pending;

    expect(store.listError()).toBe('Something went wrong loading your bookmarks.');
  });

  it('retryList() re-issues the identical page/size request', async () => {
    const pending = store.loadList();
    http
      .expectOne('/api/bookmarks?page=1&size=20')
      .flush(null, { status: 0, statusText: 'Unknown Error' });
    await pending;
    expect(store.listError()).not.toBe('');

    store.retryList();
    const retry = http.expectOne('/api/bookmarks?page=1&size=20');
    retry.flush({ items: [], total: 0, page: 1, size: 20 });

    expect(retry.request.params.get('page')).toBe('1');
    expect(retry.request.params.get('size')).toBe('20');
  });
});

describe('BookmarksStore — tag filter (F04)', () => {
  let store: BookmarksStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(BookmarksStore);
    http = TestBed.inject(HttpTestingController);
  });

  describe('F04-AC2 — selectTag', () => {
    it('always sets the filter and resets to page 1', () => {
      store.page.set(3);
      store.selectTag('research');

      expect(store.tagFilter()).toBe('research');
      expect(store.page()).toBe(1);
      http.expectOne('/api/bookmarks?page=1&size=20&tag=research').flush({
        items: [],
        total: 0,
        page: 1,
        size: 20,
      });
    });
  });

  describe('F04-AC4, AC5 — toggleTagFilter', () => {
    it('sets the filter on first activation', () => {
      store.toggleTagFilter('research');

      expect(store.tagFilter()).toBe('research');
      http
        .expectOne('/api/bookmarks?page=1&size=20&tag=research')
        .flush({ items: [], total: 0, page: 1, size: 20 });
    });

    it('clears the filter when the same tag is toggled again', () => {
      store.tagFilter.set('research');
      store.toggleTagFilter('research');

      expect(store.tagFilter()).toBeNull();
      http
        .expectOne('/api/bookmarks?page=1&size=20')
        .flush({ items: [], total: 0, page: 1, size: 20 });
    });

    it('toggling "All bookmarks" (null) when already unfiltered is a no-op value-wise', () => {
      store.toggleTagFilter(null);

      expect(store.tagFilter()).toBeNull();
      http
        .expectOne('/api/bookmarks?page=1&size=20')
        .flush({ items: [], total: 0, page: 1, size: 20 });
    });
  });

  describe('F04-AC4 — clearTagFilter', () => {
    it('clears an active filter and reloads page 1 unfiltered', () => {
      store.tagFilter.set('research');
      store.page.set(2);

      store.clearTagFilter();

      expect(store.tagFilter()).toBeNull();
      expect(store.page()).toBe(1);
      http
        .expectOne('/api/bookmarks?page=1&size=20')
        .flush({ items: [], total: 0, page: 1, size: 20 });
    });
  });

  describe('F04-AC1, AC10 — refreshTagRail (LD-03)', () => {
    it('populates tagRail and allCount from the API responses', async () => {
      const pending = store.refreshTagRail();
      const tags = [{ id: 1, name: 'reading', bookmark_count: 2 }];
      http.expectOne('/api/tags').flush(tags);
      http.expectOne('/api/bookmarks/count').flush({ total: 7 });
      await pending;

      expect(store.tagRail()).toEqual(tags);
      expect(store.allCount()).toBe(7);
    });

    it('F04-EC17 — clears the active filter when it is absent from the new rail', async () => {
      store.tagFilter.set('design');

      const pending = store.refreshTagRail();
      // design no longer has any live bookmark, so it is absent from this response.
      http.expectOne('/api/tags').flush([{ id: 1, name: 'reading', bookmark_count: 2 }]);
      http.expectOne('/api/bookmarks/count').flush({ total: 7 });
      await pending;

      expect(store.tagFilter()).toBeNull();
      // clearTagFilter() re-issues loadList() with no tag — flush it to settle.
      http
        .expectOne('/api/bookmarks?page=1&size=20')
        .flush({ items: [], total: 7, page: 1, size: 20 });
    });

    it('does not clear the filter when it is still present in the new rail', async () => {
      store.tagFilter.set('reading');

      const pending = store.refreshTagRail();
      http.expectOne('/api/tags').flush([{ id: 1, name: 'reading', bookmark_count: 2 }]);
      http.expectOne('/api/bookmarks/count').flush({ total: 7 });
      await pending;

      expect(store.tagFilter()).toBe('reading');
    });

    it('F04-EC4 — keeps only the later of two out-of-order tag-rail responses', async () => {
      const first = store.refreshTagRail();
      const second = store.refreshTagRail();

      const tagsRequests = http.match('/api/tags');
      const countRequests = http.match('/api/bookmarks/count');
      expect(tagsRequests).toHaveLength(2);
      expect(countRequests).toHaveLength(2);

      // The later call's response arrives first.
      tagsRequests[1].flush([{ id: 2, name: 'work', bookmark_count: 3 }]);
      countRequests[1].flush({ total: 3 });
      await second;

      // The earlier call's response, arriving after, must not overwrite it.
      tagsRequests[0].flush([{ id: 1, name: 'reading', bookmark_count: 2 }]);
      countRequests[0].flush({ total: 2 });
      await first;

      expect(store.tagRail()).toEqual([{ id: 2, name: 'work', bookmark_count: 3 }]);
      expect(store.allCount()).toBe(3);
    });
  });

  describe('F04-AC12 — countText', () => {
    it('reads "N of M bookmarks" when a tag filter is active, even when N is 1', () => {
      store.total.set(1);
      store.allCount.set(7);
      store.tagFilter.set('research');

      expect(store.countText()).toBe('1 of 7 bookmarks');
    });

    it("falls back to F03's singular/plural wording when no filter is active", () => {
      store.total.set(0);
      store.tagFilter.set(null);

      expect(store.countText()).toBe('0 bookmarks');
    });

    it('reads the F03 singular wording at exactly one result, with no filter active', () => {
      store.total.set(1);
      store.tagFilter.set(null);

      expect(store.countText()).toBe('1 bookmark');
    });
  });
});

describe('BookmarksStore — search (F05)', () => {
  let store: BookmarksStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(BookmarksStore);
    http = TestBed.inject(HttpTestingController);
  });

  describe('F05-AC9, AC10 — setSearchText', () => {
    it('sets search, resets to page 1, and calls listBookmarks with q', () => {
      store.page.set(3);

      store.setSearchText('tomato');

      expect(store.search()).toBe('tomato');
      expect(store.page()).toBe(1);
      http
        .expectOne('/api/bookmarks?page=1&size=20&q=tomato')
        .flush({ items: [], total: 0, page: 1, size: 20 });
    });

    it('composes with an active tag filter as both params', () => {
      store.tagFilter.set('research');

      store.setSearchText('guide');

      http
        .expectOne('/api/bookmarks?page=1&size=20&tag=research&q=guide')
        .flush({ items: [], total: 0, page: 1, size: 20 });
    });
  });

  describe('F05-AC9 — clearSearch', () => {
    it('clears search and reloads page 1 without q', () => {
      store.search.set('tomato');
      store.page.set(2);

      store.clearSearch();

      expect(store.search()).toBe('');
      expect(store.page()).toBe(1);
      http
        .expectOne('/api/bookmarks?page=1&size=20')
        .flush({ items: [], total: 0, page: 1, size: 20 });
    });
  });

  describe('F05-AC13, EC1 — loadList out-of-order guard applies to search calls', () => {
    it('keeps only the later of two out-of-order responses', async () => {
      const first = store.loadList();
      store.search.set('tomato');
      const second = store.loadList();

      const requests = http.match(() => true);
      expect(requests).toHaveLength(2);

      requests[1].flush({ items: [{ id: 2 }], total: 1, page: 1, size: 20 } as never);
      await second;

      requests[0].flush({ items: [{ id: 1 }], total: 5, page: 1, size: 20 } as never);
      await first;

      expect(store.total()).toBe(1);
    });
  });

  describe('F05-AC10 — countText composition', () => {
    it('reads "N of M bookmarks" when a search is active alone', () => {
      store.total.set(1);
      store.allCount.set(7);
      store.search.set('tomato');

      expect(store.countText()).toBe('1 of 7 bookmarks');
    });

    it('reads "N of M bookmarks" when both a tag filter and a search are active', () => {
      store.total.set(1);
      store.allCount.set(7);
      store.tagFilter.set('research');
      store.search.set('guide');

      expect(store.countText()).toBe('1 of 7 bookmarks');
    });

    it("falls back to F03's singular/plural wording when neither is active", () => {
      store.total.set(3);
      store.tagFilter.set(null);
      store.search.set('');

      expect(store.countText()).toBe('3 bookmarks');
    });
  });
});

describe('BookmarksStore — tag state (F02-T07)', () => {
  let store: BookmarksStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(BookmarksStore);
    http = TestBed.inject(HttpTestingController);
  });

  describe('addTagChip (F02-AC2, AC3, AC5, AC7)', () => {
    it('normalizes, trims and lowercases before storing', () => {
      store.addTagChip('  Research  ');
      expect(store.tags()).toEqual(['research']);
    });

    it('never stores a case-only duplicate', () => {
      store.addTagChip('Research');
      store.addTagChip('research');
      expect(store.tags()).toEqual(['research']);
    });

    it('silently ignores an empty or whitespace-only value', () => {
      store.addTagChip('   ');
      expect(store.tags()).toEqual([]);
    });

    it('silently ignores a 9th chip once 8 are already present', () => {
      for (let i = 0; i < 8; i += 1) {
        store.addTagChip(`tag${i}`);
      }
      expect(store.tags()).toHaveLength(8);

      store.addTagChip('one-too-many');
      expect(store.tags()).toHaveLength(8);
    });
  });

  it('addTagsFromText splits a comma-separated value into chips, in order (F02-EC1)', () => {
    store.addTagsFromText('urgent,docs,offline');
    expect(store.tags()).toEqual(['urgent', 'docs', 'offline']);
  });

  it('removeTagChip drops the named chip and leaves the rest untouched', () => {
    store.addTagsFromText('urgent,docs,offline');
    store.removeTagChip('docs');
    expect(store.tags()).toEqual(['urgent', 'offline']);
  });

  it('removeLastTagChip drops only the most recently added chip', () => {
    store.addTagsFromText('urgent,docs,offline');
    store.removeLastTagChip();
    expect(store.tags()).toEqual(['urgent', 'docs']);
  });

  it('removeLastTagChip is a no-op against an empty list', () => {
    store.removeLastTagChip();
    expect(store.tags()).toEqual([]);
  });

  describe('loadTagSuggestions (F02-AC11-AC13)', () => {
    it('populates tagSuggestions from the API response', async () => {
      const pending = store.loadTagSuggestions('d');
      http.expectOne('/api/tags?prefix=d').flush(['database', 'docs']);
      await pending;

      expect(store.tagSuggestions()).toEqual(['database', 'docs']);
    });

    it('degrades to an empty list on failure rather than a visible error', async () => {
      const pending = store.loadTagSuggestions('d');
      http.expectOne('/api/tags?prefix=d').flush(null, { status: 500, statusText: 'Server Error' });
      await pending;

      expect(store.tagSuggestions()).toEqual([]);
    });

    it('keeps only the later of two out-of-order responses (LD-04)', async () => {
      const first = store.loadTagSuggestions('d');
      const firstRequest = http.expectOne('/api/tags?prefix=d');

      const second = store.loadTagSuggestions('do');
      const secondRequest = http.expectOne('/api/tags?prefix=do');

      secondRequest.flush(['docs']);
      await second;
      firstRequest.flush(['database', 'docs']);
      await first;

      expect(store.tagSuggestions()).toEqual(['docs']);
    });
  });

  describe('save() — the tags field error (F02)', () => {
    it('routes a field:"tags" 400 to tagsError, not urlError', async () => {
      const pending = store.save({ url: 'https://example.com/x', tags: ['x'.repeat(25)] });
      http.expectOne('/api/bookmarks').flush(
        {
          error: {
            code: 'INVALID_TAG',
            message: 'Tags can be up to 24 characters.',
            field: 'tags',
          },
        },
        { status: 400, statusText: 'Bad Request' },
      );

      await expect(pending).resolves.toBe(false);
      expect(store.tagsError()).toBe('Tags can be up to 24 characters.');
      expect(store.urlError()).toBe('');
    });
  });

  describe('reset() (F02)', () => {
    it('clears tags, tagSuggestions and tagsError together', async () => {
      store.addTagChip('research');
      const pending = store.loadTagSuggestions('r');
      http.expectOne('/api/tags?prefix=r').flush(['research']);
      await pending;
      store.tagsError.set('Tags can be up to 24 characters.');

      store.reset();

      expect(store.tags()).toEqual([]);
      expect(store.tagSuggestions()).toEqual([]);
      expect(store.tagsError()).toBe('');
    });
  });
});

describe('BookmarksStore — delete/restore (F07)', () => {
  let store: BookmarksStore;
  let http: HttpTestingController;

  const ITEM: BookmarkListItem = {
    ...SAVED,
    tags: [],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(BookmarksStore);
    http = TestBed.inject(HttpTestingController);
  });

  /**
   * The list reload in `deleteBookmark`/`restoreBookmark`'s `finally` is fired
   * without being awaited, so the outer promise resolves before the GET is
   * dispatched. Flushing it has to happen *after* awaiting, not before.
   */
  function flushListReload(): void {
    http
      .expectOne('/api/bookmarks?page=1&size=20')
      .flush({ items: [], total: 0, page: 1, size: 20 });
  }

  describe('deleteBookmark (F07-AC3, AC6)', () => {
    it('shows the deleted toast with an undo handler and reloads the list', async () => {
      const pending = store.deleteBookmark(ITEM);
      http.expectOne({ method: 'DELETE', url: `/api/bookmarks/${ITEM.id}` }).flush(null);
      await pending;
      flushListReload();

      expect(store.toast()).toBe(DELETED_TOAST);
      expect(store.toastUndo()).not.toBeNull();
    });

    it('a 404 (the row vanished first) raises no toast but still reloads the list (F07-EC1)', async () => {
      const pending = store.deleteBookmark(ITEM);
      http
        .expectOne({ method: 'DELETE', url: `/api/bookmarks/${ITEM.id}` })
        .flush(
          { error: { code: 'NOT_FOUND', message: 'Not found.' } },
          { status: 404, statusText: 'Not Found' },
        );
      await pending;
      flushListReload();

      expect(store.toast()).toBe('');
      expect(store.toastUndo()).toBeNull();
    });

    it('an unexpected failure (not the documented 404) surfaces the server message instead of being silently swallowed (F07-RV01)', async () => {
      const pending = store.deleteBookmark(ITEM);
      http
        .expectOne({ method: 'DELETE', url: `/api/bookmarks/${ITEM.id}` })
        .flush(null, { status: 500, statusText: 'Server Error' });
      await pending;
      flushListReload();

      expect(store.toast()).toBe(FALLBACK_MESSAGE);
      expect(store.toastUndo()).toBeNull();
    });
  });

  describe('restoreBookmark (F07-AC4, AC7, AC8)', () => {
    it('clears the toast on success and reloads the list', async () => {
      const deletePending = store.deleteBookmark(ITEM);
      http.expectOne({ method: 'DELETE', url: `/api/bookmarks/${ITEM.id}` }).flush(null);
      await deletePending;
      flushListReload();

      const restorePending = store.restoreBookmark(ITEM.id);
      http
        .expectOne({ method: 'POST', url: `/api/bookmarks/${ITEM.id}/restore` })
        .flush({ bookmark: SAVED });
      await restorePending;
      flushListReload();

      expect(store.toast()).toBe('');
      expect(store.toastUndo()).toBeNull();
    });

    it('a failure replaces the toast text with the server message and removes undo (F07-AC8, F07-EC2)', async () => {
      const deletePending = store.deleteBookmark(ITEM);
      http.expectOne({ method: 'DELETE', url: `/api/bookmarks/${ITEM.id}` }).flush(null);
      await deletePending;
      flushListReload();

      const restorePending = store.restoreBookmark(ITEM.id);
      http.expectOne({ method: 'POST', url: `/api/bookmarks/${ITEM.id}/restore` }).flush(
        {
          error: {
            code: 'DUPLICATE_URL',
            message: 'That address has been saved again since. Nothing was restored.',
          },
        },
        { status: 409, statusText: 'Conflict' },
      );
      await restorePending;
      flushListReload();

      expect(store.toast()).toBe('That address has been saved again since. Nothing was restored.');
      expect(store.toastUndo()).toBeNull();
    });
  });

  describe('the toast auto-clear timer (LD-02)', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('clears itself after 6,000ms if untouched', async () => {
      const pending = store.deleteBookmark(ITEM);
      http.expectOne({ method: 'DELETE', url: `/api/bookmarks/${ITEM.id}` }).flush(null);
      await pending;
      flushListReload();

      expect(store.toast()).toBe(DELETED_TOAST);
      vi.advanceTimersByTime(5999);
      expect(store.toast()).toBe(DELETED_TOAST);
      vi.advanceTimersByTime(1);
      expect(store.toast()).toBe('');
      expect(store.toastUndo()).toBeNull();
    });

    it('a second toast cancels the first timer, so it does not clear the new one early', async () => {
      const firstDelete = store.deleteBookmark(ITEM);
      http.expectOne({ method: 'DELETE', url: `/api/bookmarks/${ITEM.id}` }).flush(null);
      await firstDelete;
      flushListReload();

      vi.advanceTimersByTime(5000);

      const secondDelete = store.deleteBookmark({ ...ITEM, id: ITEM.id + 1 });
      http.expectOne({ method: 'DELETE', url: `/api/bookmarks/${ITEM.id + 1}` }).flush(null);
      await secondDelete;
      flushListReload();

      // The first timer would have fired by now had it not been cancelled.
      vi.advanceTimersByTime(1000);
      expect(store.toast()).toBe(DELETED_TOAST);

      vi.advanceTimersByTime(5000);
      expect(store.toast()).toBe('');
    });
  });
});
