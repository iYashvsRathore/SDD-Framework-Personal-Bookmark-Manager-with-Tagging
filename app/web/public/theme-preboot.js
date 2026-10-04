// LD-02 (F08-RV01 fix): paints the theme from the localStorage mirror before
// Angular bootstraps, so the first frame is never the wrong theme (F08-AC2,
// AC3). Moved to an external same-origin file so it runs under the existing
// `script-src 'self'` CSP (hld.md section 8) without an inline exception.
// Wrapped in try/catch: storage disabled or throwing leaves <html> un-themed,
// the same as a fresh first-ever visit (F08-AC10, F08-EC5).
//
// THEME_STORAGE_KEY must match the literal exported by
// `app/web/src/app/state/theme.store.ts` (F08-RV02) — checked by
// `app/web/src/app/theme-preboot.spec.ts`.
try {
  var theme = window.localStorage.getItem('tagvault-theme');
  if (theme === 'dark') {
    document.documentElement.dataset.theme = 'dark';
  }
} catch (e) {}
