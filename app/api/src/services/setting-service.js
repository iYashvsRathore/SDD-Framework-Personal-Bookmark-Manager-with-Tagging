import { invalidThemeError } from '../lib/app-error.js';

const DEFAULT_THEME = 'light';
const ALLOWED_THEMES = new Set(['light', 'dark']);

/**
 * Orchestrates the one `setting` row this feature owns (lld.md section 5).
 * Validation happens here, before any repository call (S1) — `setting-repository.js`
 * never sees an un-validated value.
 */
export function createSettingService({ settingRepository, now = () => new Date() }) {
  const timestamp = () => now().toISOString();

  return {
    /**
     * @returns {string} the stored theme, or the default `'light'` when no row
     *   exists — this read never writes a row (F08-AC1, F08-EC1)
     */
    getTheme() {
      return settingRepository.get('theme') ?? DEFAULT_THEME;
    },

    /**
     * @param {unknown} value the raw `payload.theme`, any shape
     * @returns {string} the stored value
     * @throws {AppError} `invalidThemeError()` when `value` is not exactly
     *   `'light'` or `'dark'` (F08-AC6, F08-EC2) — thrown before any repository
     *   call, so a rejected value never touches the stored row
     */
    setTheme(value) {
      if (typeof value !== 'string' || !ALLOWED_THEMES.has(value)) {
        throw invalidThemeError();
      }
      settingRepository.upsert('theme', value, timestamp());
      return value;
    },
  };
}
