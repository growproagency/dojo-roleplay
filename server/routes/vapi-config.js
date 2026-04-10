import { Router } from "express";
import { requireUser } from "../middleware/auth.js";
import { createSessionToken } from "../lib/sessionToken.js";

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
