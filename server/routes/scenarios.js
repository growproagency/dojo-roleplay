import { Router } from "express";
import { z } from "zod/v4";
import { SCENARIOS, BUILT_IN_SCENARIO_IDS } from "../scenarios.js";
import { requireGlobalAdmin } from "../middleware/auth.js";
import { ENV } from "../config/env.js";
import {
  getActiveCustomScenarios,
  getAllCustomScenarios,
  getCustomScenarioById,
  createCustomScenario,
  updateCustomScenario,
  deleteCustomScenario,
} from "../db.js";

const router = Router();

/**
 * Sync Riley's dashboard assistant prompt with the current scenario list.
 * Called after any custom scenario CRUD operation.
 */
async function syncRileyAssistant() {
  const assistantId = process.env.VAPI_ASSISTANT_ID;
  const vapiApiKey = process.env.VAPI_API_KEY;
  if (!assistantId || !vapiApiKey) {
    console.warn("[Scenarios] Cannot sync Riley: VAPI_ASSISTANT_ID or VAPI_API_KEY not set");
    return;
  }

  try {
    const customScenarios = await getActiveCustomScenarios().catch(() => []);

    const allScenarios = [
      { title: "New Student Inquiry", desc: "adult calling about classes" },
      { title: "Parent Enrollment", desc: "parent enrolling a child" },
      { title: "Outbound Web Lead Callback", desc: "calling back a web form lead" },
      { title: "Sales Enrollment Conference", desc: "post-trial enrollment discussion" },
      { title: "Renewal Conference", desc: "renewing an existing student" },
      { title: "Cancellation Save", desc: "parent calling to cancel" },
      ...customScenarios.map(s => ({ title: s.title, desc: s.description })),
    ];

    const scenarioList = allScenarios
      .map((s, i) => `${i + 1}. ${s.title} — ${s.desc}`)
      .join("\n");

    const systemPrompt = `You are a friendly receptionist for Dojo Roleplay, a sales training system for martial arts schools.

Your job is to find out which training scenario and difficulty the caller wants, then call the handoff_tool function.

Available scenarios:
${scenarioList}

Available difficulties: Easy, Medium, Hard

Be concise. Once you know both the scenario and difficulty, immediately call the handoff_tool tool. If they only say one, ask for the other. Default to "medium" if they don't specify difficulty.`;

    const res = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${vapiApiKey}`,
      },
      body: JSON.stringify({
        model: {
          provider: "openai",
          model: "gpt-4o",
          messages: [{ role: "system", content: systemPrompt }],
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[Scenarios] Failed to sync Riley:", res.status, err);
    } else {
      console.log(`[Scenarios] Riley synced with ${allScenarios.length} scenarios`);
    }
  } catch (err) {
    console.error("[Scenarios] Riley sync error:", err);
  }
}

// GET /api/scenarios — list all available scenarios (built-in + active custom)
router.get("/", async (_req, res) => {
  try {
    const builtIn = Object.values(SCENARIOS).map(s => ({
      id: s.id,
      title: s.title,
      description: s.description,
      isBuiltIn: true,
    }));

    const custom = await getActiveCustomScenarios();
    const customList = custom.map(s => ({
      id: s.slug,
      title: s.title,
      description: s.description,
      isBuiltIn: false,
      characterName: s.characterName,
      contextType: s.contextType,
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

    // Sync Riley's dashboard prompt with the new scenario list
    syncRileyAssistant().catch(() => {});

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

    syncRileyAssistant().catch(() => {});

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

    syncRileyAssistant().catch(() => {});

    res.json({ success: true });
  } catch (err) {
    console.error("[Scenarios] delete error:", err);
    res.status(500).json({ message: "Failed to delete scenario" });
  }
});

export default router;
