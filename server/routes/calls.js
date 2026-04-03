import { Router } from "express";
import { requireUser } from "../middleware/auth.js";
import {
  getCallsByUser,
  getCallById,
  getScorecardByCallId,
  updateCall,
  createScorecard,
} from "../db.js";
import { SCENARIOS } from "../scenarios.js";
import { scoreCallTranscript } from "../scoring.js";

const router = Router();

// GET /api/calls — list user's calls
router.get("/", requireUser, async (req, res) => {
  try {
    const calls = await getCallsByUser(req.user.id);
    res.json(calls);
  } catch (err) {
    console.error("[Calls] list error:", err);
    res.status(500).json({ message: "Failed to fetch calls" });
  }
});

// GET /api/calls/:id — get call + scorecard
router.get("/:id", requireUser, async (req, res) => {
  try {
    const callId = parseInt(req.params.id, 10);
    if (isNaN(callId)) return res.status(400).json({ message: "Invalid call ID" });

    const call = await getCallById(callId);
    if (!call || call.userId !== req.user.id) {
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
    if (!call || call.userId !== req.user.id) {
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
