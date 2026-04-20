import { Router } from "express";
import { requireUser } from "../middleware/auth.js";
import { createSessionToken } from "../lib/sessionToken.js";
import { ENV } from "../config/env.js";
import { SCENARIOS } from "../scenarios.js";
import { getActiveCustomScenarios } from "../db.js";

const router = Router();

// GET /api/vapi-config — get Vapi phone config for the dashboard
router.get("/", requireUser, (_req, res) => {
  const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;
  const phoneNumber = process.env.VAPI_PHONE_NUMBER;
  const apiKey = process.env.VAPI_API_KEY;
  const publicKey = process.env.VAPI_PUBLIC_KEY;
  const serverUrl = ENV.vapiWebhookUrl || null;

  res.json({
    phoneNumber: phoneNumber || null,
    publicKey: publicKey || null,
    serverUrl: serverUrl,
    configured: !!(apiKey && phoneNumberId),
    webCallEnabled: !!(publicKey && serverUrl),
  });
});

// GET /api/vapi-config/assistant — get the dynamic Riley assistant config
// Returns the full assistant object for vapi.start() with custom scenarios included.
router.get("/assistant", requireUser, async (_req, res) => {
  try {
    const customScenarios = await getActiveCustomScenarios().catch(() => []);

    const allScenarios = [
      { id: "new_student", title: "New Student Inquiry", description: "adult calling about classes" },
      { id: "parent_enrollment", title: "Parent Enrollment", description: "parent enrolling a child" },
      { id: "web_lead_callback", title: "Outbound Web Lead Callback", description: "calling back a web form lead" },
      { id: "sales_enrollment", title: "Sales Enrollment Conference", description: "post-trial enrollment discussion" },
      { id: "renewal_conference", title: "Renewal Conference", description: "renewing an existing student" },
      { id: "cancellation_save", title: "Cancellation Save", description: "parent calling to cancel" },
      ...customScenarios.map(s => ({ id: s.slug, title: s.title, description: s.description })),
    ];

    const scenarioList = allScenarios
      .map((s, i) => `${i + 1}. ${s.title} — ${s.description}`)
      .join("\n");

    const scenarioIds = allScenarios.map(s => s.id);

    const assistant = {
      model: {
        provider: "openai",
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a friendly receptionist for Dojo Roleplay, a sales training system for martial arts schools.

Your job is to find out which training scenario and difficulty the caller wants, then call the handoff_tool function.

Available scenarios:
${scenarioList}

Available difficulties: Easy, Medium, Hard

Be concise. Once you know both the scenario and difficulty, immediately call the handoff_tool tool. If they only say one, ask for the other. Default to "medium" if they don't specify difficulty.`,
          },
        ],
      },
      voice: {
        provider: "vapi",
        voiceId: "Elliot",
      },
      firstMessage: "Welcome to Dojo Roleplay! What scenario would you like to practice today? And would you like easy, medium, or hard difficulty?",
      serverMessages: [
        "end-of-call-report",
        "status-update",
        "handoff-destination-request",
      ],
      tools: [
        {
          type: "handoff",
          function: {
            name: "handoff_tool",
            description: "Transfer to training scenario",
            parameters: {
              type: "object",
              properties: {
                scenario: {
                  type: "string",
                  enum: scenarioIds,
                  description: "The training scenario to practice",
                },
                difficulty: {
                  type: "string",
                  enum: ["easy", "medium", "hard"],
                  description: "The difficulty level",
                },
              },
              required: ["scenario", "difficulty"],
            },
          },
          destinations: [
            {
              type: "dynamic",
              server: {
                url: ENV.vapiWebhookUrl || "",
              },
            },
          ],
        },
      ],
    };

    if (ENV.vapiWebhookUrl) {
      assistant.server = {
        url: ENV.vapiWebhookUrl,
        timeoutSeconds: 20,
      };
    }

    res.json(assistant);
  } catch (err) {
    console.error("[VapiConfig] assistant config error:", err);
    res.status(500).json({ message: "Failed to build assistant config" });
  }
});

// POST /api/vapi-config/session-token — issue a short-lived signed token
// the client passes as Vapi metadata. The webhook verifies the signature
// to identify the tenant for a web call.
router.post("/session-token", requireUser, (req, res) => {
  try {
    const token = createSessionToken({
      userId: req.user.id,
      schoolId: req.user.schoolId ?? null,
      ttlSeconds: 60 * 30, // 30 minutes
    });
    res.json({ token });
  } catch (err) {
    console.error("[VapiConfig] session-token error:", err);
    res.status(500).json({ message: "Failed to issue session token" });
  }
});

export default router;
