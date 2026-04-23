import { Router } from "express";
import { z } from "zod/v4";
import { SCENARIOS, BUILT_IN_SCENARIO_IDS } from "../scenarios.js";
import { requireUser, requireGlobalAdmin } from "../middleware/auth.js";
import {
  getActiveCustomScenariosForUser,
  getAllCustomScenarios,
  getCustomScenarioById,
  createCustomScenario,
  updateCustomScenario,
  deleteCustomScenario,
} from "../db.js";

const router = Router();

// GET /api/scenarios — list all available scenarios (built-in + active custom)
// Scoped by school_id: global admins see all, others see platform-wide plus their own school's.
router.get("/", requireUser, async (req, res) => {
  try {
    const builtIn = Object.values(SCENARIOS).map(s => ({
      id: s.id,
      title: s.title,
      description: s.description,
      isBuiltIn: true,
    }));

    const custom = await getActiveCustomScenariosForUser(req.user);
    const customList = custom.map(s => ({
      id: s.slug,
      title: s.title,
      description: s.description,
      isBuiltIn: false,
      characterName: s.characterName,
      characterBlurb: s.characterBlurb,
      topics: s.topics,
      contextType: s.contextType,
      schoolId: s.schoolId,
    }));

    res.json([...builtIn, ...customList]);
  } catch (err) {
    console.error("[Scenarios] list error:", err);
    res.status(500).json({ message: "Failed to fetch scenarios" });
  }
});

// ---- CRUD (global admin only) ----

// GET /api/scenarios/custom — list all custom scenarios (including inactive)
router.get("/custom", requireGlobalAdmin, async (_req, res) => {
  try {
    const scenarios = await getAllCustomScenarios();
    res.json(scenarios);
  } catch (err) {
    console.error("[Scenarios] custom list error:", err);
    res.status(500).json({ message: "Failed to fetch custom scenarios" });
  }
});

// GET /api/scenarios/custom/:id — get a single custom scenario
router.get("/custom/:id", requireGlobalAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const scenario = await getCustomScenarioById(id);
    if (!scenario) return res.status(404).json({ message: "Scenario not found" });
    res.json(scenario);
  } catch (err) {
    console.error("[Scenarios] get error:", err);
    res.status(500).json({ message: "Failed to fetch scenario" });
  }
});

const scenarioSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().min(1).max(1000),
  contextType: z.enum(["inbound_call", "outbound_callback", "in_person"]).optional().default("inbound_call"),
  characterName: z.string().min(1).max(100),
  characterBlurb: z.string().max(255).optional().nullable(),
  topics: z.array(z.string().min(1).max(40)).max(6).optional().nullable(),
  schoolId: z.number().int().nullable().optional(),
  characterPrompt: z.string().min(10),
  openingLine: z.string().max(500).optional().nullable(),
  voiceId: z.string().min(1).max(100).optional().default("Elliot"),
  voiceProvider: z.string().min(1).max(50).optional().default("vapi"),
  scoringPrompt: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

// POST /api/scenarios/custom — create a custom scenario
router.post("/custom", requireGlobalAdmin, async (req, res) => {
  try {
    const parsed = scenarioSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid scenario data", errors: parsed.error.issues });
    }

    // Generate slug from title
    const slug = parsed.data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 100);

    // Prevent collision with built-in scenario IDs
    if (BUILT_IN_SCENARIO_IDS.includes(slug)) {
      return res.status(409).json({ message: `Slug "${slug}" conflicts with a built-in scenario. Choose a different title.` });
    }

    const scenario = await createCustomScenario({
      ...parsed.data,
      slug,
      createdBy: req.user.id,
    });

    res.json(scenario);
  } catch (err) {
    if (err?.code === "23505") {
      return res.status(409).json({ message: "A scenario with this title already exists" });
    }
    console.error("[Scenarios] create error:", err);
    res.status(500).json({ message: "Failed to create scenario" });
  }
});

// PUT /api/scenarios/custom/:id — update a custom scenario
router.put("/custom/:id", requireGlobalAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

    const existing = await getCustomScenarioById(id);
    if (!existing) return res.status(404).json({ message: "Scenario not found" });

    const parsed = scenarioSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid scenario data", errors: parsed.error.issues });
    }

    const scenario = await updateCustomScenario(id, parsed.data);

    res.json(scenario);
  } catch (err) {
    console.error("[Scenarios] update error:", err);
    res.status(500).json({ message: "Failed to update scenario" });
  }
});

// DELETE /api/scenarios/custom/:id — delete a custom scenario
router.delete("/custom/:id", requireGlobalAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

    const existing = await getCustomScenarioById(id);
    if (!existing) return res.status(404).json({ message: "Scenario not found" });

    await deleteCustomScenario(id);

    res.json({ success: true });
  } catch (err) {
    console.error("[Scenarios] delete error:", err);
    res.status(500).json({ message: "Failed to delete scenario" });
  }
});

export default router;
