import { Router } from "express";
import { z } from "zod/v4";
import { requireUser, softAuth } from "../middleware/auth.js";
import { getSchoolById, updateUserProfile, getUserById, getUserByPhoneNumber, getSchoolUsageStatus } from "../db.js";

const router = Router();

// GET /api/auth/me — return current user (with school + usage status) or null
router.get("/me", softAuth, async (req, res) => {
  if (!req.user) return res.json(null);

  let school = null;
  let usageStatus = null;
  if (req.user.schoolId) {
    [school, usageStatus] = await Promise.all([
      getSchoolById(req.user.schoolId).catch(() => null),
      getSchoolUsageStatus(req.user.schoolId).catch(() => null),
    ]);
  }

  res.json({
    ...req.user,
    school: school
      ? { id: school.id, name: school.name, slug: school.slug, usageStatus }
      : null,
  });
});

// PUT /api/auth/me — update current user's profile (name, phoneNumber)
const updateProfileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  // Allow null/empty to clear the number, otherwise require E.164 (e.g. +639171234567)
  phoneNumber: z
    .union([z.string().regex(/^\+[1-9]\d{1,14}$/, "Phone must be in E.164 format, e.g. +639171234567"), z.literal("")])
    .nullable()
    .optional(),
});

router.put("/me", requireUser, async (req, res) => {
  try {
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid profile data", errors: parsed.error.issues });
    }

    // If setting a phone number, ensure no other user already has it
    if (parsed.data.phoneNumber) {
      const existing = await getUserByPhoneNumber(parsed.data.phoneNumber).catch(() => null);
      if (existing && existing.id !== req.user.id) {
        return res.status(409).json({ message: "This phone number is already registered to another account" });
      }
    }

    await updateUserProfile(req.user.id, parsed.data);

    const updated = await getUserById(req.user.id);
    let school = null;
    if (updated?.schoolId) {
      school = await getSchoolById(updated.schoolId).catch(() => null);
    }
    res.json({
      ...updated,
      school: school ? { id: school.id, name: school.name, slug: school.slug } : null,
    });
  } catch (err) {
    console.error("[Auth] update profile error:", err);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

// POST /api/auth/logout — client-side handles Supabase signout, this is a no-op
router.post("/logout", (_req, res) => {
  res.json({ success: true });
});

export default router;
