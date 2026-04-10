import { Router } from "express";
import { z } from "zod/v4";
import { requireUser, requireSchoolAdmin } from "../middleware/auth.js";
import {
  getSchoolById,
  updateSchool,
  getUsersBySchool,
  setUserSchool,
  getCallsBySchool,
  getUsageSummary,
  getUsageByUser,
  createInvite,
  getPendingInvitesForSchool,
  revokeInvite,
} from "../db.js";

const router = Router();

function isGlobalAdmin(user) {
  return user?.role === "global_admin" || user?.role === "admin";
}

// All routes here require an authenticated user with a school (or global admin)
router.use(requireUser);

// GET /api/school — current user's school
router.get("/", async (req, res) => {
  try {
    if (!req.user.schoolId) return res.json(null);
    const school = await getSchoolById(req.user.schoolId);
    res.json(school ?? null);
  } catch (err) {
    console.error("[School] get error:", err);
    res.status(500).json({ message: "Failed to fetch school" });
  }
});

// ---- Update school details (school_admin) ----
const updateSchoolSchema = z.object({
  name: z.string().min(1).max(255).optional(),
});

router.put("/", requireSchoolAdmin, async (req, res) => {
  try {
    if (!req.user.schoolId) return res.status(400).json({ message: "You are not assigned to a school" });
    const parsed = updateSchoolSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid school data", errors: parsed.error.issues });
    }
    await updateSchool(req.user.schoolId, parsed.data);
    const school = await getSchoolById(req.user.schoolId);
    res.json(school);
  } catch (err) {
    console.error("[School] update error:", err);
    res.status(500).json({ message: "Failed to update school" });
  }
});

// ---- Members ----
router.get("/members", requireSchoolAdmin, async (req, res) => {
  try {
    if (!req.user.schoolId) return res.json([]);
    const members = await getUsersBySchool(req.user.schoolId);
    res.json(members);
  } catch (err) {
    console.error("[School] members error:", err);
    res.status(500).json({ message: "Failed to fetch members" });
  }
});

router.delete("/members/:userId", requireSchoolAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(userId)) return res.status(400).json({ message: "Invalid user id" });

    // Don't let admins remove themselves
    if (userId === req.user.id) {
      return res.status(400).json({ message: "You cannot remove yourself from the school" });
    }

    // Validate the target user belongs to the same school
    const members = await getUsersBySchool(req.user.schoolId);
    const target = members.find(m => m.id === userId);
    if (!target) return res.status(404).json({ message: "Member not found in your school" });

    // Set their school_id to NULL (keeps user account, just unassigns them)
    await setUserSchool(userId, null, "staff");
    res.json({ success: true });
  } catch (err) {
    console.error("[School] remove member error:", err);
    res.status(500).json({ message: "Failed to remove member" });
  }
});

// ---- Invites ----
const createInviteSchema = z.object({
  email: z.string().email().max(320),
  role: z.enum(["staff", "school_admin"]).optional().default("staff"),
});

router.get("/invites", requireSchoolAdmin, async (req, res) => {
  try {
    if (!req.user.schoolId) return res.json([]);
    const invites = await getPendingInvitesForSchool(req.user.schoolId);
    res.json(invites);
  } catch (err) {
    console.error("[School] invites list error:", err);
    res.status(500).json({ message: "Failed to fetch invites" });
  }
});

router.post("/invites", requireSchoolAdmin, async (req, res) => {
  try {
    if (!req.user.schoolId) return res.status(400).json({ message: "You are not assigned to a school" });
    const parsed = createInviteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid invite data", errors: parsed.error.issues });
    }

    const invite = await createInvite({
      schoolId: req.user.schoolId,
      email: parsed.data.email,
      role: parsed.data.role,
      invitedBy: req.user.id,
      expiresInDays: 7,
    });

    // Build the magic link URL using the request origin
    const origin = req.headers.origin || req.headers.referer || "";
    const acceptUrl = origin
      ? `${origin.replace(/\/$/, "")}/invite/${invite.token}`
      : `/invite/${invite.token}`;

    res.json({ ...invite, acceptUrl });
  } catch (err) {
    if (err?.code === "23505") {
      return res.status(409).json({ message: "An active invite already exists for this email" });
    }
    console.error("[School] invite create error:", err);
    res.status(500).json({ message: "Failed to create invite" });
  }
});

router.delete("/invites/:id", requireSchoolAdmin, async (req, res) => {
  try {
    const inviteId = parseInt(req.params.id, 10);
    if (isNaN(inviteId)) return res.status(400).json({ message: "Invalid invite id" });

    // Verify the invite belongs to this school
    const invites = await getPendingInvitesForSchool(req.user.schoolId);
    const target = invites.find(i => i.id === inviteId);
    if (!target) return res.status(404).json({ message: "Invite not found" });

    await revokeInvite(inviteId);
    res.json({ success: true });
  } catch (err) {
    console.error("[School] invite revoke error:", err);
    res.status(500).json({ message: "Failed to revoke invite" });
  }
});

// ---- Usage (school-scoped) ----
router.get("/usage", requireSchoolAdmin, async (req, res) => {
  try {
    if (!req.user.schoolId) return res.json({ summary: null, byUser: [] });
    const fromDate = typeof req.query.fromDate === "string" ? new Date(req.query.fromDate) : undefined;
    const toDate = typeof req.query.toDate === "string" ? new Date(req.query.toDate) : undefined;

    const [summary, byUser] = await Promise.all([
      getUsageSummary(fromDate, toDate, req.user.schoolId),
      getUsageByUser(fromDate, toDate, req.user.schoolId),
    ]);

    res.json({ summary, byUser });
  } catch (err) {
    console.error("[School] usage error:", err);
    res.status(500).json({ message: "Failed to fetch school usage" });
  }
});

// ---- All school calls (for school_admin call history) ----
router.get("/calls", requireSchoolAdmin, async (req, res) => {
  try {
    if (!req.user.schoolId) return res.json([]);
    const calls = await getCallsBySchool(req.user.schoolId);
    res.json(calls);
  } catch (err) {
    console.error("[School] calls error:", err);
    res.status(500).json({ message: "Failed to fetch school calls" });
  }
});

export default router;
