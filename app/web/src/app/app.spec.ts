import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from './app';
import { BookmarkList } from './features/bookmark-list/bookmark-list';
import { BookmarksStore, TITLE_FALLBACK_NOTICE } from './state/bookmarks.store';
import type { BookmarkListItem } from './core/models';

/**
 * Structural assertions for the F01-AC17 shell. The keyboard walkthrough itself is
 * performed by a human and recorded in tasks.md; these tests pin the parts of the
 * contract a machine can check, so a later refactor cannot quietly drop them.
 */
describe('App shell (F01-AC17)', () => {
  let host: HTMLElement;
  let fixture: ReturnType<typeof TestBed.createComponent<App>>;

  beforeEach(async () => {
    delete document.documentElement.dataset['theme'];
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
  });

  it('renders the header with an Add bookmark button', () => {
    const header = host.querySelector('header');
    expect(header).not.toBeNull();

    const add = header!.querySelector('button.add');
    expect(add?.textContent?.trim()).toBe('Add bookmark');
  });

  it('renders the floating add button with an accessible name', () => {
    const fab = host.querySelector('button.fab');

    expect(fab).not.toBeNull();
    // The FAB is icon-only, so its name has to come from aria-label.
    expect(fab!.getAttribute('aria-label')).toBe('Add bookmark');
  });

  it('renders the toast region as a polite live region present from first paint', () => {
    const toasts = host.querySelector('#toasts');

    expect(toasts).not.toBeNull();
    expect(toasts!.getAttribute('aria-live')).toBe('polite');
  });

  it('renders the F01-AC5 notice inside that region, where it survives the dialog closing', () => {
    TestBed.inject(BookmarksStore).toast.set(TITLE_FALLBACK_NOTICE);
    fixture.detectChanges();

    expect(host.querySelector('#toasts')!.textContent!.trim()).toBe(TITLE_FALLBACK_NOTICE);
  });

  it('gives both add affordances an explicit type, so neither submits a form', () => {
    for (const selector of ['button.add', 'button.fab']) {
      expect(host.querySelector(selector)!.getAttribute('type')).toBe('button');
    }
  });

  it('hides decorative icons from assistive technology', () => {
    const icons = host.querySelectorAll('.ic');

    expect(icons.length).toBeGreaterThan(0);
    for (const icon of Array.from(icons)) {
      expect(icon.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('renders the real bookmark list component, not a static placeholder', () => {
    expect(host.querySelector('app-bookmark-list')).not.toBeNull();
  });

  it('requests the first page once on startup (F03-T08)', async () => {
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne((r) => r.url === '/api/bookmarks')
      .flush({ items: [], total: 0, page: 1, size: 20 });
    await Promise.resolve();
    fixture.detectChanges();

    expect(host.querySelector('.empty h2')?.textContent).toBe('No bookmarks yet');
  });

  it('wires the list empty state Add bookmark button to the same dialog as the header button', async () => {
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne((r) => r.url === '/api/bookmarks')
      .flush({ items: [], total: 0, page: 1, size: 20 });
    await Promise.resolve();
    fixture.detectChanges();

    const addButton = Array.from(host.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Add bookmark' && b.closest('.empty'),
    );
    expect(addButton).toBeDefined();
    addButton!.click();
    fixture.detectChanges();

    expect((host.querySelector('dialog') as HTMLDialogElement | null)?.open).toBe(true);
  });

  describe('F06-T10 — edit wiring', () => {
    const ITEM: BookmarkListItem = {
      id: 7,
      url: 'https://example.com/original',
      title: 'Original title',
      title_source: 'user',
      created_at: '2025-01-15T10:30:00.000Z',
      updated_at: '2025-01-15T10:30:00.000Z',
      tags: ['design'],
    };

    it('opens the form in edit mode with that item\u2019s data when editRequested fires (F06-AC1)', () => {
      const list = fixture.debugElement.query(By.directive(BookmarkList)).componentInstance;
      const opener = document.createElement('button');
      document.body.append(opener);

      list.editRequested.emit({ item: ITEM, opener });
      fixture.detectChanges();

      const store = TestBed.inject(BookmarksStore);
      expect(store.editing()).toEqual({ id: ITEM.id, updatedAt: ITEM.updated_at });
      expect(store.url()).toBe(ITEM.url);
      expect((host.querySelector('dialog') as HTMLDialogElement).open).toBe(true);

      opener.remove();
    });

    it('opens the form in edit mode pre-filled from details after a 409 + editExisting (F06-AC12, C-F06-03)', () => {
      const store = TestBed.inject(BookmarksStore);
      store.url.set('https://example.com/typed-but-discarded');
      store.duplicate.set({
        code: 'DUPLICATE_URL',
        message: 'You already saved this address.',
        field: 'url',
        existingId: 9,
        details: {
          title: 'Existing title',
          url: 'https://example.com/existing',
          tags: ['docs'],
          updatedAt: '2025-01-15T09:00:00.000Z',
        },
      });
      fixture.detectChanges();

      const editButton = Array.from(host.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === 'Edit existing',
      )!;
      editButton.click();
      fixture.detectChanges();

      expect(store.editing()).toEqual({ id: 9, updatedAt: '2025-01-15T09:00:00.000Z' });
      expect(store.url()).toBe('https://example.com/existing');
      expect(store.userTitle()).toBe('Existing title');
      expect(store.tags()).toEqual(['docs']);
      expect((host.querySelector('dialog') as HTMLDialogElement).open).toBe(true);
    });
  });

  describe('F01-AC11/F03 — View existing wiring', () => {
    it('closes the dialog, clears the tag filter, returns to page 1 and reloads on viewExisting', async () => {
      const http = TestBed.inject(HttpTestingController);
      http
        .expectOne((r) => r.url === '/api/bookmarks')
        .flush({ items: [], total: 0, page: 1, size: 20 });
      await Promise.resolve();
      fixture.detectChanges();

      const store = TestBed.inject(BookmarksStore);
      store.tagFilter.set('design');
      store.page.set(2);
      store.duplicate.set({
        code: 'DUPLICATE_URL',
        message: 'You already saved this address.',
        field: 'url',
        existingId: 9,
        details: {
          title: 'Existing title',
          url: 'https://example.com/existing',
          tags: ['docs'],
          updatedAt: '2025-01-15T09:00:00.000Z',
        },
      });
      fixture.detectChanges();

      const viewButton = Array.from(host.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === 'View existing',
      )!;
      viewButton.click();
      fixture.detectChanges();

      expect(store.tagFilter()).toBeNull();
      expect(store.page()).toBe(1);

      http
        .expectOne((r) => r.url === '/api/bookmarks')
        .flush({
          items: [
            {
              id: 9,
              url: 'https://example.com/existing',
              title: 'Existing title',
              title_source: 'user',
              created_at: '2025-01-15T09:00:00.000Z',
              updated_at: '2025-01-15T09:00:00.000Z',
              tags: ['docs'],
            },
          ],
          total: 1,
          page: 1,
          size: 20,
        });
      await Promise.resolve();
      await Promise.resolve();
      fixture.detectChanges();

      const storeForAllCount = TestBed.inject(BookmarksStore);
      storeForAllCount.allCount.set(1);
      fixture.detectChanges();

      expect((host.querySelector('dialog') as HTMLDialogElement).open).toBe(false);
      expect(host.querySelector('#b-9')).not.toBeNull();
    });
  });

  describe('F08-AC2/AC3 — header theme toggle wiring', () => {
    it('renders light with aria-pressed=false and label "Dark mode" on first paint, with no OS prefers-color-scheme detection', () => {
      // AC2: a fresh visit (no localStorage mirror) must render light, never
      // derived from matchMedia/prefers-color-scheme — the component only
      // reads document.documentElement.dataset.theme (already asserted by
      // theme.store.spec.ts's own unit tests); this pins the rendered DOM.
      const toggle = host.querySelector('button.sq') as HTMLButtonElement;

      expect(toggle).not.toBeNull();
      expect(toggle.getAttribute('aria-pressed')).toBe('false');
      expect(toggle.getAttribute('aria-label')).toBe('Dark mode');
    });

    it('flips to dark on click: aria-pressed, label, and icon all update together (AC3)', () => {
      const toggle = host.querySelector('button.sq') as HTMLButtonElement;

      toggle.click();
      fixture.detectChanges();

      expect(toggle.getAttribute('aria-pressed')).toBe('true');
      expect(toggle.getAttribute('aria-label')).toBe('Light mode');
      expect(document.documentElement.dataset['theme']).toBe('dark');

      // The app constructor's own theme.load() GET is still pending (never
      // flushed in this suite); match on method so it isn't mistaken for it.
      const http2 = TestBed.inject(HttpTestingController);
      http2.expectOne({ url: '/api/settings/theme', method: 'PUT' }).flush({ theme: 'dark' });
    });

    it('is a native button reachable by Tab, carrying no custom tabindex (AC7)', () => {
      const toggle = host.querySelector('button.sq') as HTMLButtonElement;

      expect(toggle.tagName).toBe('BUTTON');
      expect(toggle.hasAttribute('tabindex')).toBe(false);
      expect(toggle.disabled).toBe(false);
    });
  });
});
