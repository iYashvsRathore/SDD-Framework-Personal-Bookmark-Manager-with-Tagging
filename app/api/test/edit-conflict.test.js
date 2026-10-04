import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDb } from '../src/data/db.js';
import { createBookmarkRepository } from '../src/data/bookmark-repository.js';
import { createTagRepository } from '../src/data/tag-repository.js';
import { createBookmarkService } from '../src/services/bookmark-service.js';
import { createTagService } from '../src/services/tag-service.js';

/**
 * F06-T05: a "two tabs" simulation (lld.md section 4, AMD-003, LD-01). Tab A
 * and Tab B both load the same row, Tab A saves first, then Tab B's edit
 * (still holding the original `updatedAt`) must be rejected — the row must
 * keep Tab A's values, not be overwritten or merged.
 */

const CREATED_AT = new Date('2025-01-15T10:30:00.000Z');
const FIRST_SAVE_AT = new Date('2025-01-15T11:00:00.000Z');
const SECOND_ATTEMPT_AT = new Date('2025-01-15T11:05:00.000Z');

let db;
let repository;
let service;

function makeService(now) {
  const tagRepository = createTagRepository(db);
  repository = createBookmarkRepository(db, tagRepository);
  const tagService = createTagService({ tagRepository });
  return createBookmarkService({
    repository,
    fetchTitle: vi.fn(async () => ({ ok: true, title: 'Fetched Title' })),
    tagService,
    now: () => now,
  });
}

beforeEach(() => {
  db = createDb({ file: ':memory:' });
  service = makeService(CREATED_AT);
});

describe('F06-AC11, F06-EC21 — two tabs editing the same row', () => {
  it("rejects the second tab's stale save and leaves the first tab's values intact", async () => {
    const created = await service.create({ url: 'https://example.com/a', title: 'Original' });
    const staleUpdatedAt = created.updated_at;

    const tabAService = makeService(FIRST_SAVE_AT);
    const tabA = await tabAService.update(created.id, {
      url: 'https://example.com/a-from-tab-a',
      title: 'Saved by Tab A',
      updatedAt: staleUpdatedAt,
    });

    const tabBService = makeService(SECOND_ATTEMPT_AT);
    await expect(
      tabBService.update(created.id, {
        url: 'https://example.com/a-from-tab-b',
        title: 'Saved by Tab B',
        updatedAt: staleUpdatedAt,
      })
    ).rejects.toMatchObject({
      code: 'EDIT_CONFLICT',
      status: 409,
      message: 'This bookmark changed in another tab. Reload to see the latest, then try again.',
    });

    const row = repository.findLiveById(created.id);
    expect(row.title).toBe('Saved by Tab A');
    expect(row.url).toBe('https://example.com/a-from-tab-a');
    expect(row.updated_at).toBe(tabA.updated_at);
    expect(row.updated_at).not.toBe(SECOND_ATTEMPT_AT.toISOString());
  });
});
