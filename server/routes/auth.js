import { Router } from "express";
import { softAuth } from "../middleware/auth.js";

const router = Router();

// GET /api/auth/me — return current user or null
router.get("/me", softAuth, (req, res) => {
  res.json(req.user || null);
});

// POST /api/auth/logout — client-side handles Supabase signout, this is a no-op
router.post("/logout", (_req, res) => {
  res.json({ success: true });
});

export default router;
