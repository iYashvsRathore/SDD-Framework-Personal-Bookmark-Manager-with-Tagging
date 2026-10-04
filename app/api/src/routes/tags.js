import { Router } from 'express';

/**
 * HTTP only (hld.md section 5). F01 ships the unfiltered shape so the shell's
 * empty sidebar state is driven by a real response (LD-03); F02 adds the
 * `prefix`-present branch for tag autocomplete (F02-AC11, AC12, AC13).
 */
export function createTagsRouter({ repository, tagService }) {
  const router = Router();

  router.get('/tags', (req, res) => {
    if (req.query.prefix !== undefined) {
      res.json(tagService.suggest(req.query.prefix));
      return;
    }
    res.json(repository.listWithLiveBookmarks());
  });

  return router;
}
