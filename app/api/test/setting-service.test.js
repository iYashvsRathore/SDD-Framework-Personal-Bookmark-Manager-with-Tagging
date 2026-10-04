import { describe, expect, it, vi } from 'vitest';
import { createSettingService } from '../src/services/setting-service.js';

const FIXED_NOW = () => new Date('2025-01-15T10:30:00.000Z');

function makeService(getImpl = () => null) {
  const settingRepository = { get: vi.fn(getImpl), upsert: vi.fn() };
  const service = createSettingService({ settingRepository, now: FIXED_NOW });
  return { service, settingRepository };
}

describe('getTheme — F08-AC1, F08-EC1', () => {
  it('returns the default "light" when no row exists, without writing one', () => {
    const { service, settingRepository } = makeService(() => null);

    expect(service.getTheme()).toBe('light');
    expect(settingRepository.upsert).not.toHaveBeenCalled();
  });

  it('returns the stored value as-is', () => {
    const { service } = makeService(() => 'dark');

    expect(service.getTheme()).toBe('dark');
  });
});

describe('setTheme — F08-AC4, persists and returns the value', () => {
  it('"dark" upserts and returns "dark"', () => {
    const { service, settingRepository } = makeService();

    expect(service.setTheme('dark')).toBe('dark');
    expect(settingRepository.upsert).toHaveBeenCalledWith(
      'theme',
      'dark',
      '2025-01-15T10:30:00.000Z'
    );
  });

  it('"light" upserts and returns "light"', () => {
    const { service, settingRepository } = makeService();

    expect(service.setTheme('light')).toBe('light');
    expect(settingRepository.upsert).toHaveBeenCalledWith(
      'theme',
      'light',
      '2025-01-15T10:30:00.000Z'
    );
  });
});

describe('setTheme — F08-AC6, F08-EC2, rejects anything outside the allow-list', () => {
  it.each([['blue'], [''], [undefined], [null], [42], [['dark']], [{ theme: 'dark' }]])(
    'rejects %j without writing',
    (value) => {
      const { service, settingRepository } = makeService();

      expect(() => service.setTheme(value)).toThrowError('Theme must be "light" or "dark".');
      expect(settingRepository.upsert).not.toHaveBeenCalled();
    }
  );

  it('the thrown error carries code INVALID_THEME and field theme', () => {
    const { service } = makeService();

    try {
      service.setTheme('blue');
      expect.unreachable();
    } catch (error) {
      expect(error.code).toBe('INVALID_THEME');
      expect(error.field).toBe('theme');
      expect(error.status).toBe(400);
    }
  });
});
