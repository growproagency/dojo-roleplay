import { Router } from "express";
import { requireAdmin } from "../middleware/auth.js";
import { getUsageSummary, getUsageByUser } from "../db.js";

const router = Router();

// GET /api/admin/usage?fromDate=X&toDate=Y — get usage stats (admin only)
router.get("/usage", requireAdmin, async (req, res) => {
  try {
    const fromDate = typeof req.query.fromDate === "string" ? new Date(req.query.fromDate) : undefined;
    const toDate = typeof req.query.toDate === "string" ? new Date(req.query.toDate) : undefined;

    const [summary, byUser] = await Promise.all([
      getUsageSummary(fromDate, toDate),
      getUsageByUser(fromDate, toDate),
    ]);

    res.json({ summary, byUser });
  } catch (err) {
    console.error("[Admin] usage error:", err);
    res.status(500).json({ message: "Failed to fetch usage data" });
  }
});

export default router;
