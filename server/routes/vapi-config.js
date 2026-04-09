import { Router } from "express";
import { requireUser } from "../middleware/auth.js";

const router = Router();

// GET /api/vapi/config — get Vapi phone config for the dashboard
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

export default router;
