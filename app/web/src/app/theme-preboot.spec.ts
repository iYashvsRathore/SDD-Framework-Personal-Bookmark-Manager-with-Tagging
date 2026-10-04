import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { THEME_STORAGE_KEY } from './state/theme.store';

/**
 * F08-RV02: `public/theme-preboot.js` runs before Angular bootstraps, so it
 * cannot import `THEME_STORAGE_KEY` — its localStorage key is a hand-typed
 * string literal that must be kept in sync by hand (lld.md section 3). This
 * test catches a future drift between the two, rather than relying on that
 * discipline alone.
 */
describe('F08-RV02 — theme-preboot.js stays in sync with THEME_STORAGE_KEY', () => {
  it('contains the same localStorage key literal as ThemeStore', () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const scriptPath = path.resolve(here, '../../public/theme-preboot.js');
    const script = fs.readFileSync(scriptPath, 'utf8');

    expect(script).toContain(`'${THEME_STORAGE_KEY}'`);
  });
});
