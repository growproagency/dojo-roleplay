import { Router } from "express";
import { z } from "zod/v4";
import { requireUser } from "../middleware/auth.js";
import { getSchoolSettings, upsertSchoolSettings } from "../db.js";

const router = Router();

const settingsSchema = z.object({
  schoolName: z.string().min(1).max(255),
  streetAddress: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  zipCode: z.string().max(20).optional(),
  introOffer: z.string().optional(),
  priceRangeLow: z.number().int().min(0).optional(),
  priceRangeHigh: z.number().int().min(0).optional(),
  programDirectorName: z.string().max(100).optional(),
  additionalNotes: z.string().optional(),
});

// GET /api/settings — get school settings
router.get("/", requireUser, async (req, res) => {
  try {
    const s = await getSchoolSettings(req.user.id);
    res.json(s ?? null);
  } catch (err) {
    console.error("[Settings] get error:", err);
    res.status(500).json({ message: "Failed to fetch settings" });
  }
});

// PUT /api/settings — save school settings
router.put("/", requireUser, async (req, res) => {
  try {
    const parsed = settingsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid settings data", errors: parsed.error.issues });
    }

    const input = parsed.data;
    await upsertSchoolSettings({
      userId: req.user.id,
      schoolName: input.schoolName,
      streetAddress: input.streetAddress ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      zipCode: input.zipCode ?? null,
      introOffer: input.introOffer ?? null,
      priceRangeLow: input.priceRangeLow ?? null,
      priceRangeHigh: input.priceRangeHigh ?? null,
      programDirectorName: input.programDirectorName ?? null,
      additionalNotes: input.additionalNotes ?? null,
    });
    res.json({ success: true });
  } catch (err) {
    console.error("[Settings] save error:", err);
    res.status(500).json({ message: "Failed to save settings" });
  }
});

export default router;
