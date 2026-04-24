import { Router } from "express";
import { requireUser, effectiveSchoolId } from "../middleware/auth.js";
import { getLeaderboard } from "../db.js";

const router = Router();

function isGlobalAdmin(user) {
  return user?.role === "global_admin" || user?.role === "admin";
}

// GET /api/leaderboard — get staff rankings
//   Staff/school admin: scoped to their own school (schoolId required)
//   Global admin: scoped to the school they're currently "viewing"
//                 (X-Viewing-School-Id header). No viewing school → platform-wide.
router.get("/", requireUser, async (req, res) => {
  try {
    const user = req.user;
    const schoolId = effectiveSchoolId(req);

    if (!isGlobalAdmin(user) && !schoolId) return res.json([]);

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
