import { Router } from "express";

const router = Router();

// GET /api/system/health — health check (public)
router.get("/health", (_req, res) => {
  res.json({ ok: true });
});

export default router;
