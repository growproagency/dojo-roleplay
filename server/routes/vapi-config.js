import { Router } from "express";
import { requireUser } from "../middleware/auth.js";
import { createSessionToken } from "../lib/sessionToken.js";
import { ENV } from "../config/env.js";
import { getActiveCustomScenarios } from "../db.js";

const router = Router();

// GET /api/vapi-config — get Vapi phone config for the dashboard
router.get("/", requireUser, (_req, res) => {
  const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;
  const phoneNumber = process.env.VAPI_PHONE_NUMBER;
  const apiKey = process.env.VAPI_API_KEY;
  const publicKey = process.env.VAPI_PUBLIC_KEY;
  const assistantId = process.env.VAPI_ASSISTANT_ID;

  res.json({
    phoneNumber: phoneNumber || null,
    publicKey: publicKey || null,
    assistantId: assistantId || null,
    configured: !!(apiKey && phoneNumberId),
    webCallEnabled: !!(publicKey && assistantId),
  });
});

// GET /api/vapi-config/overrides — get assistantOverrides with dynamic scenario list
// Used by the frontend to override Riley's system prompt at call start time.
router.get("/overrides", requireUser, async (_req, res) => {
  try {
    const customScenarios = await getActiveCustomScenarios().catch(() => []);

    const allScenarios = [
      { id: "new_student", title: "New Student Inquiry", desc: "adult calling about classes" },
      { id: "parent_enrollment", title: "Parent Enrollment", desc: "parent enrolling a child" },
      { id: "web_lead_callback", title: "Outbound Web Lead Callback", desc: "calling back a web form lead" },
      { id: "sales_enrollment", title: "Sales Enrollment Conference", desc: "post-trial enrollment discussion" },
      { id: "renewal_conference", title: "Renewal Conference", desc: "renewing an existing student" },
      { id: "cancellation_save", title: "Cancellation Save", desc: "parent calling to cancel" },
      ...customScenarios.map(s => ({ id: s.slug, title: s.title, desc: s.description })),
    ];

    const scenarioList = allScenarios
      .map((s, i) => `${i + 1}. ${s.title} — ${s.desc}`)
      .join("\n");

    res.json({
      model: {
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
    });
  } catch (err) {
    console.error("[VapiConfig] overrides error:", err);
    res.status(500).json({ message: "Failed to build overrides" });
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
