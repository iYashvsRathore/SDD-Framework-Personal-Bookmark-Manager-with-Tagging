import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../core/api.service';
import type { Theme } from '../core/models';

/**
 * The `localStorage` key both this store's mirror write and `index.html`'s
 * inline pre-paint script (LD-02) read/write. Kept as one named constant here
 * even though the inline script cannot import it (it runs before Angular
 * bootstraps) — the two string literals must be kept in sync by hand.
 */
export const THEME_STORAGE_KEY = 'tagvault-theme';

const DEFAULT_THEME: Theme = 'light';

/** Best-effort `localStorage` write (F08-AC10, F08-EC5) — failure is silent. */
function writeMirror(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // The theme still switches visually and the PUT still succeeds; only the
    // first-paint optimization is lost (lld.md section 8).
  }
}

/**
 * F08's client-side theme state (lld.md section 3, LD-01).
 *
 * The `setting` row on the server is the one authoritative source (hld.md
 * section 6.5); the `localStorage` mirror and this store's signal are both
 * render hints. `load()` reconciles with the server on startup; `toggle()`
 * flips optimistically and persists in the background.
 */
@Injectable({ providedIn: 'root' })
export class ThemeStore {
  private readonly api = inject(ApiService);

  /**
   * Initialized from whatever `<html data-theme>` the pre-paint script (or a
   * fresh-visit default) already set, so this signal starts in sync with the
   * first frame rather than assuming 'light' and causing a second flip.
   */
  readonly theme = signal<Theme>(
    document.documentElement.dataset['theme'] === 'dark' ? 'dark' : DEFAULT_THEME,
  );

  /** LD-03: only the most recently issued `load()`/`toggle()` call may write state. */
  private requestToken = 0;

  private apply(theme: Theme): void {
    this.theme.set(theme);
    document.documentElement.dataset['theme'] = theme;
  }

  /**
   * Reconciles with the server's stored value on app startup (F08-AC5, EC26).
   * A rejected `GET` is a silent, non-fatal fallback (F08-AC9, F08-EC4): the
   * pre-paint value — already applied — simply stands.
   */
  async load(): Promise<void> {
    const token = ++this.requestToken;
    try {
      const { theme } = await this.api.getTheme();
      if (token !== this.requestToken) return;
      this.apply(theme);
    } catch (error) {
      void error;
      // No visible error UI — this is a silent fallback (lld.md section 8).
    }
  }

  /**
   * Flips the theme optimistically, ahead of the `PUT` resolving (F08-AC3),
   * and persists the mirror and the server value in the background. Guarded
   * against the rapid-toggle race (F08-AC8, LD-03): a response whose token is
   * no longer the latest is discarded on arrival, never applied.
   */
  async toggle(): Promise<void> {
    const token = ++this.requestToken;
    const next: Theme = this.theme() === 'dark' ? 'light' : 'dark';
    this.apply(next);
    writeMirror(next);

    try {
      const { theme } = await this.api.setTheme(next);
      if (token !== this.requestToken) return;
      this.apply(theme);
    } catch (error) {
      void error;
      // The optimistic flip stands — no rollback (lld.md section 8).
    }
  }
}
