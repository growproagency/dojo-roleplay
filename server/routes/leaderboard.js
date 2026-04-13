import { Router } from "express";
import { requireUser } from "../middleware/auth.js";
import { getLeaderboard } from "../db.js";

const router = Router();

function isGlobalAdmin(user) {
  return user?.role === "global_admin" || user?.role === "admin";
}

// GET /api/leaderboard — get staff rankings
//   Default: scoped to the requester's school
//   Global admin: optional ?schoolId=N for any school, or omit for platform-wide
router.get("/", requireUser, async (req, res) => {
  try {
    const user = req.user;
    let schoolId = null;

    if (isGlobalAdmin(user)) {
      schoolId = req.query.schoolId ? parseInt(req.query.schoolId, 10) : null;
    } else {
      if (!user.schoolId) return res.json([]);
      schoolId = user.schoolId;
    }

    const leaderboard = await getLeaderboard(schoolId);
    res.json(leaderboard);
  } catch (err) {
    console.error("[Leaderboard] error:", err);
    res.status(500).json({ message: "Failed to fetch leaderboard" });
  }
});

export default router;
