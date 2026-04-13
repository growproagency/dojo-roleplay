import { Router } from "express";
import { requireGlobalAdmin } from "../middleware/auth.js";
import { getUsageSummary, getUsageByUser } from "../db.js";

const router = Router();

// GET /api/admin/usage?fromDate=X&toDate=Y&schoolId=N — platform-wide usage stats
// (global admin only)
router.get("/usage", requireGlobalAdmin, async (req, res) => {
  try {
    const fromDate = typeof req.query.fromDate === "string" ? new Date(req.query.fromDate) : undefined;
    const toDate = typeof req.query.toDate === "string" ? new Date(req.query.toDate) : undefined;
    const schoolId = req.query.schoolId ? parseInt(req.query.schoolId, 10) : null;

    const [summary, byUser] = await Promise.all([
      getUsageSummary(fromDate, toDate, schoolId),
      getUsageByUser(fromDate, toDate, schoolId),
    ]);

    res.json({ summary, byUser });
  } catch (err) {
    console.error("[Admin] usage error:", err);
    res.status(500).json({ message: "Failed to fetch usage data" });
  }
});

export default router;
