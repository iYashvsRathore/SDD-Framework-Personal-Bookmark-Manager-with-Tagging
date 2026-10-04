import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeStore } from './theme.store';

describe('ThemeStore', () => {
  let store: ThemeStore;
  let http: HttpTestingController;

  beforeEach(() => {
    delete document.documentElement.dataset['theme'];
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(ThemeStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    delete document.documentElement.dataset['theme'];
  });

  describe('F08-AC9 — load() falls back silently on a rejected GET', () => {
    it('keeps the current theme and sets no error state', async () => {
      const pending = store.load();
      http
        .expectOne('/api/settings/theme')
        .flush(null, { status: 500, statusText: 'Server Error' });

      await expect(pending).resolves.toBeUndefined();
      expect(store.theme()).toBe('light');
    });
  });

  describe('F08-AC5 — load() applies the server value', () => {
    it('updates the theme signal and <html data-theme>', async () => {
      const pending = store.load();
      http.expectOne('/api/settings/theme').flush({ theme: 'dark' });
      await pending;

      expect(store.theme()).toBe('dark');
      expect(document.documentElement.dataset['theme']).toBe('dark');
    });
  });

  describe('F08-AC3 — toggle() flips optimistically before the PUT resolves', () => {
    it('flips the signal and <html data-theme> immediately', () => {
      expect(store.theme()).toBe('light');

      void store.toggle();

      expect(store.theme()).toBe('dark');
      expect(document.documentElement.dataset['theme']).toBe('dark');

      http.expectOne('/api/settings/theme').flush({ theme: 'dark' });
    });
  });

  describe('F08-AC8 — rapid toggle race, the last call wins', () => {
    it('discards an out-of-order response, keeping the final state at the last call', async () => {
      const first = store.toggle(); // light -> dark
      const firstRequest = http.expectOne('/api/settings/theme');

      const second = store.toggle(); // dark -> light
      const secondRequest = http.expectOne('/api/settings/theme');

      // The later call's response arrives first; the earlier call's response,
      // arriving after, must not overwrite it.
      secondRequest.flush({ theme: 'light' });
      await second;
      firstRequest.flush({ theme: 'dark' });
      await first;

      expect(store.theme()).toBe('light');
      expect(document.documentElement.dataset['theme']).toBe('light');
    });
  });

  describe('F08-AC10, F08-EC5 — a throwing localStorage does not crash the store', () => {
    it('toggle() still flips the theme and the PUT still fires', () => {
      const spy = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
        throw new Error('storage disabled');
      });

      expect(() => store.toggle()).not.toThrow();
      expect(store.theme()).toBe('dark');

      http.expectOne('/api/settings/theme').flush({ theme: 'dark' });
      spy.mockRestore();
    });
  });
});
