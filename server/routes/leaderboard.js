import { Router } from "express";
import { requireUser } from "../middleware/auth.js";
import { getLeaderboard } from "../db.js";

const router = Router();

function isGlobalAdmin(user) {
  return user?.role === "global_admin" || user?.role === "admin";
}

// GET /api/leaderboard — get staff rankings
//   Staff/school admin: always scoped to their own schoolId (header is ignored).
//   Global admin: scoped to ?schoolId query param.
//                 schoolId omitted or "all" → platform-wide aggregate.
//                 The in-page School filter is the source of truth — sidebar
//                 viewing context does not affect this analytical view.
router.get("/", requireUser, async (req, res) => {
  try {
    const user = req.user;
    let schoolId = null;

    if (isGlobalAdmin(user)) {
      const raw = req.query.schoolId;
      schoolId = raw && raw !== "all" ? parseInt(raw, 10) : null;
    } else {
      if (!user.schoolId) return res.json([]);
      schoolId = user.schoolId;
    }

    const scenario = typeof req.query.scenario === "string" && req.query.scenario ? req.query.scenario : undefined;
    const range = req.query.range; // "7d" | "30d" | "90d" | "all"
    let fromDate;
    if (range === "7d") fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    else if (range === "30d") fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    else if (range === "90d") fromDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    const leaderboard = await getLeaderboard(schoolId, { scenario, fromDate });
    res.json(leaderboard);
  } catch (err) {
    console.error("[Leaderboard] error:", err);
    res.status(500).json({ message: "Failed to fetch leaderboard" });
  }
});

export default router;
