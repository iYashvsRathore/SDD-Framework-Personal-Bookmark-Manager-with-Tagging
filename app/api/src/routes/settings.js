import { Router } from 'express';

/**
 * HTTP only (hld.md section 5): parse the request, call one service, map the
 * result to a status. No SQL, no business rule. `theme` is the one setting
 * this app has — the route never accepts a request-supplied key (lld.md
 * section 9).
 */
export function createSettingsRouter({ service }) {
  const router = Router();

  router.get('/settings/theme', (_req, res) => {
    res.json({ theme: service.getTheme() });
  });

  router.put('/settings/theme', (req, res) => {
    const theme = service.setTheme(req.body?.theme);
    res.json({ theme });
  });

  return router;
}
