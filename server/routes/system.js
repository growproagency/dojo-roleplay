import { Router } from "express";
import { requireUser } from "../middleware/auth.js";
import { getMaintenanceNotice } from "../db.js";

const router = Router();

// GET /api/system/health — health check (public)
router.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// GET /api/system/maintenance-notice — current maintenance banner state.
// Auth-required so we don't expose internal state to anonymous visitors.
// Returns only { enabled, message, severity } — never markup/model/cap.
router.get("/maintenance-notice", requireUser, async (_req, res) => {
  try {
    const notice = await getMaintenanceNotice();
    res.json(notice);
  } catch (err) {
    console.error("[System] maintenance-notice error:", err);
    res.status(500).json({ message: "Failed to fetch maintenance notice" });
  }
});

export default router;
