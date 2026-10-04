import { Router } from 'express';

/**
 * HTTP only: parse the request, call one service, map the result to a status.
 * No SQL, no business rule (hld.md section 5).
 *
 * Express 5 routes a rejected promise to the error middleware, so no per-handler
 * try/catch is needed (technology.md TD-02).
 */
export function createBookmarksRouter({ service }) {
  const router = Router();

  router.post('/bookmarks', async (req, res) => {
    const bookmark = await service.create(req.body ?? {});
    res.status(201).json({ bookmark });
  });

  /**
   * F06: the edit path. `req.params.id` is coerced to a Number only for the
   * bound-parameter lookups the service/repository already perform (S4) — an
   * absent or non-numeric id simply matches no row, producing the same
   * NOT_FOUND a deleted row would, never a 500.
   */
  router.put('/bookmarks/:id', async (req, res) => {
    const bookmark = await service.update(Number(req.params.id), req.body ?? {});
    res.json({ bookmark });
  });

  /**
   * F07: soft-delete (F07-AC3, AC6, AC9, AC10). `:id` is coerced the same way
   * the existing PUT route already does — an absent or non-numeric id simply
   * matches no row, producing the same NOT_FOUND a deleted row would.
   */
  router.delete('/bookmarks/:id', async (req, res) => {
    await service.softDelete(Number(req.params.id));
    res.status(204).send();
  });

  /**
   * F07: restore (F07-AC4, AC7, AC8, AC10), same `:id` coercion.
   */
  router.post('/bookmarks/:id/restore', async (req, res) => {
    const bookmark = await service.restore(Number(req.params.id));
    res.json({ bookmark });
  });

  /**
   * The real paging contract (F03-AC1, AC3, AC5, AC6), plus F04's `tag` filter
   * (F04-AC3, AC7, AC8) and F05's `q` search filter (F05-AC1-AC6, AC9).
   * `page`/`size`/`tag`/`q` are passed through to `service.list()` completely
   * unvalidated — clamping and normalization happen only in
   * `lib/pagination.js`/`services/list-query.js`, never here, so any value at
   * all returns 200.
   */
  router.get('/bookmarks', (req, res) => {
    res.json(
      service.list({
        page: req.query.page,
        size: req.query.size,
        tag: req.query.tag,
        q: req.query.q,
      })
    );
  });

  /**
   * The live (unfiltered) bookmark count (LD-04, F04-AC1, AC12). Registered
   * BEFORE this file's own `:id`-shaped routes, as forward-looking guidance:
   * no `GET /bookmarks/:id` route exists in this file today (only PUT/DELETE/
   * POST .../restore use `:id`, different methods, so no ordering conflict is
   * currently possible) — but if one is ever added, it MUST be registered
   * after this line so Express's registration-order matching never parses
   * `count` as an `:id` value (lld.md section 3's routing note — a build-order
   * constraint for F06/F07).
   */
  router.get('/bookmarks/count', (_req, res) => {
    res.json({ total: service.countLive() });
  });

  return router;
}
