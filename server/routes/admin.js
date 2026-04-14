import { Router } from "express";
import { z } from "zod/v4";
import { requireGlobalAdmin } from "../middleware/auth.js";
import {
  getUsageSummary,
  getUsageByUser,
  getAllSchools,
  getSchoolById,
  createSchool,
  updateSchool,
  deleteSchool,
  getUsersBySchool,
  getAllUsers,
  setUserSchool,
  updateUserRole,
  deleteUser,
  getCallsBySchool,
} from "../db.js";

const router = Router();

// All routes require global admin
router.use(requireGlobalAdmin);

// ============================================
// Usage
// ============================================

// GET /api/admin/usage?fromDate=X&toDate=Y&schoolId=N
router.get("/usage", async (req, res) => {
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

// ============================================
// Schools
// ============================================

// GET /api/admin/schools — list all schools with member counts
router.get("/schools", async (req, res) => {
  try {
    const schools = await getAllSchools();

    // Attach member count to each school
    const enriched = await Promise.all(
      schools.map(async (school) => {
        const members = await getUsersBySchool(school.id).catch(() => []);
        return {
          ...school,
          memberCount: members.length,
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    console.error("[Admin] list schools error:", err);
    res.status(500).json({ message: "Failed to fetch schools" });
  }
});

// GET /api/admin/schools/:id — school detail with members
router.get("/schools/:id", async (req, res) => {
  try {
    const schoolId = parseInt(req.params.id, 10);
    if (isNaN(schoolId)) return res.status(400).json({ message: "Invalid school ID" });

    const school = await getSchoolById(schoolId);
    if (!school) return res.status(404).json({ message: "School not found" });

    const members = await getUsersBySchool(schoolId).catch(() => []);

    res.json({ school, members });
  } catch (err) {
    console.error("[Admin] school detail error:", err);
    res.status(500).json({ message: "Failed to fetch school" });
  }
});

// POST /api/admin/schools — create a new school
const createSchoolSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).optional(),
});

router.post("/schools", async (req, res) => {
  try {
    const parsed = createSchoolSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid school data", errors: parsed.error.issues });
    }
    const school = await createSchool({
      name: parsed.data.name,
      slug: parsed.data.slug || parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      ownerUserId: req.user.id,
    });
    res.json(school);
  } catch (err) {
    if (err?.code === "23505") {
      return res.status(409).json({ message: "A school with this name or slug already exists" });
    }
    console.error("[Admin] create school error:", err);
    res.status(500).json({ message: "Failed to create school" });
  }
});

// PUT /api/admin/schools/:id — update school details
const updateSchoolSchema = z.object({
  name: z.string().min(1).max(255).optional(),
});

router.put("/schools/:id", async (req, res) => {
  try {
    const schoolId = parseInt(req.params.id, 10);
    if (isNaN(schoolId)) return res.status(400).json({ message: "Invalid school ID" });

    const parsed = updateSchoolSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid data", errors: parsed.error.issues });
    }

    await updateSchool(schoolId, parsed.data);
    const school = await getSchoolById(schoolId);
    res.json(school);
  } catch (err) {
    console.error("[Admin] update school error:", err);
    res.status(500).json({ message: "Failed to update school" });
  }
});

// DELETE /api/admin/schools/:id — delete school (unassigns all members)
router.delete("/schools/:id", async (req, res) => {
  try {
    const schoolId = parseInt(req.params.id, 10);
    if (isNaN(schoolId)) return res.status(400).json({ message: "Invalid school ID" });

    const school = await getSchoolById(schoolId);
    if (!school) return res.status(404).json({ message: "School not found" });

    await deleteSchool(schoolId);
    res.json({ success: true });
  } catch (err) {
    console.error("[Admin] delete school error:", err);
    res.status(500).json({ message: "Failed to delete school" });
  }
});

// ============================================
// Members (cross-school)
// ============================================

// GET /api/admin/users — list all users platform-wide
router.get("/users", async (req, res) => {
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (err) {
    console.error("[Admin] list users error:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// PUT /api/admin/users/:id/role — change a user's role
const changeRoleSchema = z.object({
  role: z.enum(["staff", "school_admin", "global_admin"]),
});

router.put("/users/:id/role", async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) return res.status(400).json({ message: "Invalid user ID" });

    // Don't let admin demote themselves
    if (userId === req.user.id) {
      return res.status(400).json({ message: "You cannot change your own role" });
    }

    const parsed = changeRoleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid role", errors: parsed.error.issues });
    }

    await updateUserRole(userId, parsed.data.role);
    res.json({ success: true });
  } catch (err) {
    console.error("[Admin] change role error:", err);
    res.status(500).json({ message: "Failed to change role" });
  }
});

// PUT /api/admin/users/:id/school — assign/unassign a user to/from a school
const assignSchoolSchema = z.object({
  schoolId: z.number().int().positive().nullable(),
});

router.put("/users/:id/school", async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) return res.status(400).json({ message: "Invalid user ID" });

    const parsed = assignSchoolSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid data", errors: parsed.error.issues });
    }

    // If assigning to a school, verify school exists
    if (parsed.data.schoolId) {
      const school = await getSchoolById(parsed.data.schoolId);
      if (!school) return res.status(404).json({ message: "School not found" });
    }

    await setUserSchool(userId, parsed.data.schoolId);
    res.json({ success: true });
  } catch (err) {
    console.error("[Admin] assign school error:", err);
    res.status(500).json({ message: "Failed to assign school" });
  }
});

// DELETE /api/admin/users/:id — remove a user entirely
router.delete("/users/:id", async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) return res.status(400).json({ message: "Invalid user ID" });

    if (userId === req.user.id) {
      return res.status(400).json({ message: "You cannot delete yourself" });
    }

    await deleteUser(userId);
    res.json({ success: true });
  } catch (err) {
    console.error("[Admin] delete user error:", err);
    res.status(500).json({ message: "Failed to delete user" });
  }
});

export default router;
