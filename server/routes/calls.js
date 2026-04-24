import { Router } from "express";
import { requireUser, effectiveSchoolId } from "../middleware/auth.js";
import {
  getCallsByUser,
  getCallsBySchool,
  getCallsBySchoolAndUser,
  getCallById,
  getScorecardByCallId,
  updateCall,
  createScorecard,
} from "../db.js";
import { SCENARIOS } from "../scenarios.js";
import { scoreCallTranscript } from "../scoring.js";

const router = Router();

function isGlobalAdmin(user) {
  return user?.role === "global_admin" || user?.role === "admin";
}
function isSchoolAdmin(user) {
  return user?.role === "school_admin";
}

// GET /api/calls — list calls
//   Staff:        own calls only
//   School admin: ?scope=mine|school (default school) — always scoped to their schoolId
//   Global admin: scoped to the school they're currently "viewing" (X-Viewing-School-Id header).
//                 With no school selected, returns [] (they should use a per-page filter instead).
router.get("/", requireUser, async (req, res) => {
  try {
    const user = req.user;
    const scope = req.query.scope === "mine" ? "mine" : "school";
    const schoolId = effectiveSchoolId(req);

    if (isGlobalAdmin(user)) {
      if (!schoolId) return res.json([]);
      const userIdParam = req.query.userId ? parseInt(req.query.userId, 10) : null;
      if (userIdParam) {
        const calls = await getCallsBySchoolAndUser(schoolId, userIdParam);
        return res.json(calls);
      }
      const calls = await getCallsBySchool(schoolId);
      return res.json(calls);
    }

    if (isSchoolAdmin(user)) {
      if (!schoolId) return res.json([]);
      if (scope === "mine") {
        const calls = await getCallsByUser(user.id);
        return res.json(calls);
      }
      const userIdParam = req.query.userId ? parseInt(req.query.userId, 10) : null;
      if (userIdParam) {
        const calls = await getCallsBySchoolAndUser(schoolId, userIdParam);
        return res.json(calls);
      }
      const calls = await getCallsBySchool(schoolId);
      return res.json(calls);
    }

    // staff
    const calls = await getCallsByUser(user.id);
    res.json(calls);
  } catch (err) {
    console.error("[Calls] list error:", err);
    res.status(500).json({ message: "Failed to fetch calls" });
  }
});

// Authorization helper for a single call
function canAccessCall(user, call) {
  if (!call) return false;
  if (isGlobalAdmin(user)) return true;
  if (isSchoolAdmin(user)) return call.schoolId === user.schoolId;
  return call.userId === user.id;
}

// GET /api/calls/:id — get call + scorecard
router.get("/:id", requireUser, async (req, res) => {
  try {
    const callId = parseInt(req.params.id, 10);
    if (isNaN(callId)) return res.status(400).json({ message: "Invalid call ID" });

    const call = await getCallById(callId);
    if (!canAccessCall(req.user, call)) {
      return res.status(404).json({ message: "Call not found" });
    }

    const scorecard = await getScorecardByCallId(call.id);
    res.json({ call, scorecard: scorecard ?? null });
  } catch (err) {
    console.error("[Calls] get error:", err);
    res.status(500).json({ message: "Failed to fetch call" });
  }
});

// POST /api/calls/:id/score — trigger scoring for a call
router.post("/:id/score", requireUser, async (req, res) => {
  try {
    const callId = parseInt(req.params.id, 10);
    if (isNaN(callId)) return res.status(400).json({ message: "Invalid call ID" });

    const call = await getCallById(callId);
    if (!canAccessCall(req.user, call)) {
      return res.status(404).json({ message: "Call not found" });
    }
    if (!call.transcription || call.transcription.trim().length < 50) {
      return res.status(400).json({ message: "No transcript available for scoring" });
    }

    const scenario = SCENARIOS[call.scenario];
    await updateCall(call.id, { status: "scoring" });

    try {
      const result = await scoreCallTranscript(call.transcription, scenario.title);
      await createScorecard({
        callId: call.id,
        overallScore: result.overallScore,
        categories: result.categories,
        highlights: result.highlights,
        missedOpportunities: result.missedOpportunities,
        suggestions: result.suggestions,
        summary: result.summary,
      });
      await updateCall(call.id, { status: "scored" });
      res.json({ success: true });
    } catch (err) {
      await updateCall(call.id, { status: "completed" });
      throw err;
    }
  } catch (err) {
    console.error("[Calls] triggerScoring error:", err);
    res.status(500).json({ message: "Failed to score call" });
  }
});

export default router;
