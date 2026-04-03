import { Router } from "express";
import { requireUser } from "../middleware/auth.js";

const router = Router();

// GET /api/vapi/config — get Vapi phone config for the dashboard
router.get("/config", requireUser, (_req, res) => {
  const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;
  const phoneNumber = process.env.VAPI_PHONE_NUMBER;
  const apiKey = process.env.VAPI_API_KEY;

  res.json({
    phoneNumber: phoneNumber || null,
    configured: !!(apiKey && phoneNumberId),
  });
});

export default router;
