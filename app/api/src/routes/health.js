import { Router } from 'express';

/** Smoke check 1 of the api contract in component-map.json. */
const router = Router();

router.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

export default router;
