import { Router } from "express";
import { softAuth } from "../middleware/auth.js";
import { getSchoolById } from "../db.js";

const router = Router();

// GET /api/auth/me — return current user (with school) or null
router.get("/me", softAuth, async (req, res) => {
  if (!req.user) return res.json(null);

  let school = null;
  if (req.user.schoolId) {
    school = await getSchoolById(req.user.schoolId).catch(() => null);
  }

  res.json({
    ...req.user,
    school: school ? { id: school.id, name: school.name, slug: school.slug } : null,
  });
});

// POST /api/auth/logout — client-side handles Supabase signout, this is a no-op
router.post("/logout", (_req, res) => {
  res.json({ success: true });
});

export default router;
