import { Router } from "express";
import { requireUser } from "../middleware/auth.js";
import { getLeaderboard } from "../db.js";

const router = Router();

// GET /api/leaderboard — get staff rankings
router.get("/", requireUser, async (_req, res) => {
  try {
    const leaderboard = await getLeaderboard();
    res.json(leaderboard);
  } catch (err) {
    console.error("[Leaderboard] error:", err);
    res.status(500).json({ message: "Failed to fetch leaderboard" });
  }
});

export default router;
