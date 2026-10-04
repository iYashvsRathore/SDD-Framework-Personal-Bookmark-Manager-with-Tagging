import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { AppError, toErrorResponse } from './lib/app-error.js';
import { MESSAGES } from './lib/validate-url.js';
import { createBookmarkRepository } from './data/bookmark-repository.js';
import { createTagRepository } from './data/tag-repository.js';
import { createSettingRepository } from './data/setting-repository.js';
import { createBookmarkService } from './services/bookmark-service.js';
import { createTagService } from './services/tag-service.js';
import { createSettingService } from './services/setting-service.js';
import { createProductionTitleFetcher } from './services/title-fetch.js';
import { createBookmarksRouter } from './routes/bookmarks.js';
import { createTagsRouter } from './routes/tags.js';
import { createSettingsRouter } from './routes/settings.js';
import healthRouter from './routes/health.js';

/**
 * Content-Security-Policy, verbatim from hld.md section 8.
 * Even a successful injection then has no script origin to load from (S3).
 */
export const CSP_HEADER_VALUE =
  "default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'";

/** Request bodies are { url, title? } — a small cap is all this API ever needs (S1). */
const JSON_BODY_LIMIT = '16kb';

const here = path.dirname(fileURLToPath(import.meta.url));

/** GENERATED build output of the web component (hld.md section 4). Never hand-edited. */
export const PUBLIC_DIR = path.resolve(here, '..', 'public');

/**
 * Assemble the Express app. Kept separate from server.js so tests can mount it
 * without opening a listener.
 *
 * @param {{
 *   db: import('better-sqlite3').Database,
 *   fetchTitle?: Function,
 *   now?: Function,
 * }} deps the already-bootstrapped connection plus the injectable seams
 *   (lld.md section 11). Tests supply ':memory:', a fake fetcher and a fixed clock.
 */
export function createApp(deps = {}) {
  const app = express();
  app.disable('x-powered-by');

  // tagRepository is constructed before bookmarkRepository, which now depends
  // on it (LD-02): a bookmark and its tag links are written in one transaction.
  const tagRepository = createTagRepository(deps.db);
  const tagService = createTagService({ tagRepository });
  const repository = createBookmarkRepository(deps.db, tagRepository);
  const service = createBookmarkService({
    repository,
    fetchTitle: deps.fetchTitle ?? createProductionTitleFetcher(),
    tagService,
    now: deps.now,
  });
  const settingRepository = createSettingRepository(deps.db);
  const settingService = createSettingService({ settingRepository, now: deps.now });

  app.use((_req, res, next) => {
    res.setHeader('Content-Security-Policy', CSP_HEADER_VALUE);
    next();
  });

  app.use(express.json({ limit: JSON_BODY_LIMIT }));

  app.use('/api', healthRouter);
  app.use('/api', createBookmarksRouter({ service }));
  app.use('/api', createTagsRouter({ repository: tagRepository, tagService }));
  app.use('/api', createSettingsRouter({ service: settingService }));

  app.use(express.static(PUBLIC_DIR));

  app.use(errorMiddleware);

  return app;
}

/**
 * body-parser raises its OWN errors before any route runs: a body that is not valid
 * JSON, or one past JSON_BODY_LIMIT. Those are client faults, and body-parser already
 * tags them `status: 400`. Without this translation they would fall through to the
 * generic 500 STORAGE_ERROR, telling a user "your other bookmarks are safe" about a
 * request that never reached storage — a 5xx for a 4xx cause, which contradicts the
 * error taxonomy in hld.md section 8.
 *
 * No new error code or message is introduced: from the caller's side no web address
 * was successfully received, which is exactly what MESSAGES.EMPTY says.
 */
function asClientBodyError(err) {
  if (err?.type === 'entity.parse.failed' || err?.type === 'entity.too.large') {
    return new AppError('INVALID_URL', MESSAGES.EMPTY, { field: 'url' });
  }
  return err;
}

/**
 * The single error middleware (hld.md section 8). Express 5 routes rejected promises
 * here, so no per-handler try/catch is needed (technology.md TD-02).
 * Express identifies error middleware by arity, so all four parameters must stay.
 */
function errorMiddleware(err, _req, res, _next) {
  const { status, body } = toErrorResponse(asClientBodyError(err));
  if (status >= 500) {
    // Full detail to the server console only — never to the client (U5).
    console.error('[api] unhandled error:', err);
  }
  res.status(status).json(body);
}
