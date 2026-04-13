import { Router } from "express";
import { getScenarioSystemPrompt, SCENARIOS } from "../scenarios.js";
import { scoreCallTranscript } from "../scoring.js";
import {
  createCall,
  updateCall,
  getCallByVapiId,
  getSchoolSettings,
  createScorecard,
  getUserByPhoneNumber,
  countRecentPhoneAttempts,
  logPhoneCallAttempt,
} from "../db.js";
import { verifySessionToken } from "../lib/sessionToken.js";
import { ENV } from "../config/env.js";

const router = Router();

// ============================================
// In-memory tenant context cache
// Maps Vapi callId -> { userId, schoolId }
// Set on first event of a call (assistant-request, tool-calls, handoff).
// Cleaned up on end-of-call-report.
// ============================================
const callContextCache = new Map();

function setCallContext(vapiCallId, ctx) {
  if (!vapiCallId || !ctx) return;
  callContextCache.set(vapiCallId, ctx);
}

function getCallContext(vapiCallId) {
  if (!vapiCallId) return null;
  return callContextCache.get(vapiCallId) || null;
}

function clearCallContext(vapiCallId) {
  if (!vapiCallId) return;
  callContextCache.delete(vapiCallId);
}

// ============================================
// Tenant identification helpers
// ============================================

/**
 * Extract tenant context from a Vapi webhook payload.
 * Tries (in order):
 *   1. Cached context (set on a previous event for this call)
 *   2. Web call signed session token in metadata
 *   3. Phone call caller ID lookup
 *   4. DB lookup by vapi_call_id (for events that arrive after the call row exists)
 *   5. DEFAULT_SCHOOL_ID env fallback (transition safety net)
 */
async function resolveTenantContext(message) {
  const call = message?.call;
  const vapiCallId = call?.id;

  // 1. Cache hit
  const cached = getCallContext(vapiCallId);
  if (cached) return cached;

  // 2. Web call: signed session token in metadata
  const metadata = call?.metadata || call?.assistantOverrides?.metadata || {};
  const sessionToken = metadata.sessionToken;
  if (sessionToken) {
    const payload = verifySessionToken(sessionToken);
    if (payload && payload.userId && payload.schoolId) {
      const ctx = { userId: payload.userId, schoolId: payload.schoolId };
      setCallContext(vapiCallId, ctx);
      console.log(`[Vapi] Tenant from session token: userId=${ctx.userId}, schoolId=${ctx.schoolId} (call ${vapiCallId})`);
      return ctx;
    }
    if (payload) {
      console.warn(`[Vapi] Session token valid but missing userId/schoolId`, payload);
    } else {
      console.warn(`[Vapi] Session token verification failed`);
    }
  }

  // 3. Phone call: caller ID lookup
  const callerNumber = call?.customer?.number;
  if (callerNumber) {
    const user = await getUserByPhoneNumber(callerNumber).catch(() => null);
    if (user && user.schoolId) {
      const ctx = { userId: user.id, schoolId: user.schoolId };
      setCallContext(vapiCallId, ctx);
      return ctx;
    }
  }

  // 4. DB lookup by vapi_call_id (later events for an existing call row)
  if (vapiCallId) {
    const dbCall = await getCallByVapiId(vapiCallId).catch(() => null);
    if (dbCall && dbCall.userId && dbCall.schoolId) {
      const ctx = { userId: dbCall.userId, schoolId: dbCall.schoolId };
      setCallContext(vapiCallId, ctx);
      return ctx;
    }
  }

  // 5. Safety net: default school + a placeholder user
  if (ENV.defaultSchoolId) {
    console.warn(`[Vapi] Falling back to DEFAULT_SCHOOL_ID=${ENV.defaultSchoolId} (userId=${ENV.defaultUserId ?? "null"}) for call ${vapiCallId}`);
    return { userId: ENV.defaultUserId ?? null, schoolId: ENV.defaultSchoolId };
  }

  return null;
}

// ============================================
// Rejection assistant for unknown phone callers
// ============================================
function buildRejectionAssistant(message) {
  return {
    model: {
      provider: "openai",
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Say the first message exactly as written, then end the call immediately. Do not engage in further conversation.",
        },
      ],
    },
    voice: {
      provider: "vapi",
      voiceId: "Elliot",
    },
    firstMessage: message,
    endCallAfterSpokenEnabled: true,
    maxDurationSeconds: 15,
    silenceTimeoutSeconds: 5,
  };
}

// ============================================
// Webhook entrypoint
// ============================================
router.post("/webhook", async (req, res) => {
  const { message } = req.body;
  if (!message) {
    console.log(`[Vapi] No message in payload. Full body:`, JSON.stringify(req.body).slice(0, 500));
    return res.status(400).json({ error: "No message in payload" });
  }

  const eventType = message.type;
  console.log(`[Vapi] Event: ${eventType}`);

  try {
    switch (eventType) {
      case "assistant-request":
        return await handleAssistantRequest(message, res);

      case "tool-calls":
        return await handleToolCalls(message, res);

      case "handoff-destination-request":
        return await handleHandoffRequest(message, res);

      case "end-of-call-report":
        return await handleEndOfCallReport(message, res);

      case "status-update":
        return await handleStatusUpdate(message, res);

      default:
        return res.json({});
    }
  } catch (err) {
    console.error(`[Vapi] Error handling ${eventType}:`, err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================
// Event handlers
// ============================================

async function handleAssistantRequest(message, res) {
  const call = message?.call;
  const vapiCallId = call?.id;
  const callType = call?.type;

  // For phone calls, enforce caller ID whitelist
  if (callType === "inboundPhoneCall") {
    const callerNumber = call?.customer?.number;

    if (!callerNumber) {
      console.warn(`[Vapi] Phone call with no caller number — rejecting`);
      return res.json({
        assistant: buildRejectionAssistant(
          "Sorry, your phone number could not be identified. Please try again from a different phone. Goodbye."
        ),
      });
    }

    // Rate limit check
    const recentAttempts = await countRecentPhoneAttempts(callerNumber, 60).catch(() => 0);
    if (recentAttempts >= 5) {
      await logPhoneCallAttempt({
        callerNumber,
        vapiCallId,
        outcome: "rejected_rate_limit",
      }).catch(() => {});
      return res.json({
        assistant: buildRejectionAssistant(
          "Too many calls from this number recently. Please try again later. Goodbye."
        ),
      });
    }

    // Lookup user by phone number
    const user = await getUserByPhoneNumber(callerNumber).catch(() => null);
    if (!user || !user.schoolId) {
      await logPhoneCallAttempt({
        callerNumber,
        vapiCallId,
        outcome: "rejected_unknown",
      }).catch(() => {});
      return res.json({
        assistant: buildRejectionAssistant(
          "Sorry, this number isn't registered with Dojo Roleplay. Please add your phone number in your account settings and try again. Goodbye."
        ),
      });
    }

    // Known user — log + cache + return personalized receptionist
    await logPhoneCallAttempt({
      callerNumber,
      vapiCallId,
      userId: user.id,
      schoolId: user.schoolId,
      outcome: "accepted",
    }).catch(() => {});
    setCallContext(vapiCallId, { userId: user.id, schoolId: user.schoolId });

    return res.json({ assistant: buildReceptionistAssistant(user.name) });
  }

  // Web call (or unknown type) — return generic receptionist.
  // Tenant identification will happen at handoff time via session token in metadata.
  return res.json({ assistant: buildReceptionistAssistant(null) });
}

function buildReceptionistAssistant(userName) {
  const greeting = userName
    ? `Hi ${userName}! What scenario would you like to practice today? And would you like easy, medium, or hard difficulty?`
    : "Welcome to Dojo Roleplay! What scenario would you like to practice today? And would you like easy, medium, or hard difficulty?";

  return {
    model: {
      provider: "openai",
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a friendly receptionist for Dojo Roleplay, a sales training system for martial arts schools.

Your job is to find out which training scenario and difficulty the caller wants, then call the startTrainingCall function.

Available scenarios:
1. New Student Inquiry — adult calling about classes
2. Parent Enrollment — parent enrolling a child
3. Outbound Web Lead Callback — calling back a web form lead
4. Sales Enrollment Conference — post-trial enrollment discussion
5. Renewal Conference — renewing an existing student
6. Cancellation Save — parent calling to cancel

Available difficulties: Easy, Medium, Hard

Be concise. Once you know both the scenario and difficulty, immediately call startTrainingCall. If they only say one, ask for the other. Default to "medium" if they don't specify difficulty.`,
        },
      ],
    },
    voice: {
      provider: "vapi",
      voiceId: "Elliot",
    },
    firstMessage: greeting,
    tools: [
      {
        type: "function",
        function: {
          name: "startTrainingCall",
          description: "Start the training roleplay once the caller has selected a scenario and difficulty",
          parameters: {
            type: "object",
            properties: {
              scenario: {
                type: "string",
                enum: [
                  "new_student",
                  "parent_enrollment",
                  "web_lead_callback",
                  "sales_enrollment",
                  "renewal_conference",
                  "cancellation_save",
                ],
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
      },
    ],
  };
}

async function handleToolCalls(message, res) {
  const toolCalls = message.toolCallList || [];
  const call = message.call;
  const vapiCallId = call?.id;
  const results = [];

  // Resolve tenant context (cache, session token, caller ID, fallback)
  const tenant = await resolveTenantContext(message);

  for (const toolCall of toolCalls) {
    if (toolCall.function?.name === "startTrainingCall") {
      const args = toolCall.function.arguments || {};
      const scenario = args.scenario;
      const difficulty = args.difficulty || "medium";

      if (!scenario || !SCENARIOS[scenario]) {
        results.push({
          toolCallId: toolCall.id,
          result: "Invalid scenario. Please pick from: new_student, parent_enrollment, web_lead_callback, sales_enrollment, renewal_conference, cancellation_save.",
        });
        continue;
      }

      if (!tenant || !tenant.schoolId) {
        console.warn(`[Vapi] tool-calls: no tenant context for call ${vapiCallId} — skipping DB write`);
        results.push({
          toolCallId: toolCall.id,
          result: "Session not identified. Please reload the dashboard and try again.",
        });
        continue;
      }

      // Fetch school settings for prompt customization
      const settings = await getSchoolSettings(tenant.schoolId).catch(() => null);

      // Generate the full system prompt
      const systemPrompt = getScenarioSystemPrompt(scenario, settings, difficulty);

      // Create call record
      const callDbId = await createCall({
        userId: tenant.userId ?? null,
        schoolId: tenant.schoolId,
        scenario,
        difficulty,
        vapiCallId: vapiCallId || null,
        status: "in_progress",
      });

      console.log(`[Vapi] Starting training: scenario=${scenario}, difficulty=${difficulty}, callDbId=${callDbId}, schoolId=${tenant.schoolId}`);

      results.push({
        toolCallId: toolCall.id,
        result: `IMPORTANT: You are now switching roles. Stop being the receptionist. From this moment, adopt the following character and follow these instructions exactly. Do NOT mention that you are an AI or a receptionist. Stay in character for the rest of the call.\n\n${systemPrompt}`,
      });
    } else {
      results.push({ toolCallId: toolCall.id, result: "Unknown function." });
    }
  }

  res.json({ results });
}

async function handleHandoffRequest(message, res) {
  console.log(`[Vapi] Handoff request payload:`, JSON.stringify(message).slice(0, 500));
  const call = message.call;
  const vapiCallId = call?.id;
  const handoffData = message.parameters || message.toolCall?.function?.arguments || {};

  const scenario = handoffData.scenario || "new_student";
  const difficulty = handoffData.difficulty || "medium";

  if (!SCENARIOS[scenario]) {
    console.warn("[Vapi] handoff-destination-request: invalid scenario", scenario);
    return res.json({ error: "Invalid scenario" });
  }

  // Resolve tenant context
  const tenant = await resolveTenantContext(message);

  if (!tenant || !tenant.schoolId) {
    console.warn(`[Vapi] handoff: no tenant context for call ${vapiCallId} — refusing handoff`);
    return res.json({ error: "Session not identified" });
  }

  // Create call record (if not already created by tool-calls)
  let dbCall = await getCallByVapiId(vapiCallId).catch(() => null);
  let callDbId;
  if (dbCall) {
    callDbId = dbCall.id;
  } else {
    callDbId = await createCall({
      userId: tenant.userId ?? null,
      schoolId: tenant.schoolId,
      scenario,
      difficulty,
      vapiCallId: vapiCallId || null,
      status: "in_progress",
    });
  }

  // Fetch school settings
  const settings = await getSchoolSettings(tenant.schoolId).catch(() => null);
  const systemPrompt = getScenarioSystemPrompt(scenario, settings, difficulty);
  const scenarioTitle = SCENARIOS[scenario].title;

  console.log(`[Vapi] Handoff: scenario=${scenario}, difficulty=${difficulty}, callDbId=${callDbId}, schoolId=${tenant.schoolId}`);

  // First messages for each scenario (what the AI character says first)
  const firstMessages = {
    new_student: "Hey, I was just calling to get some info about your adult classes?",
    parent_enrollment: "Hi, yeah — I'm calling about your kids' program? I'm thinking about enrolling my son.",
    web_lead_callback: null,
    sales_enrollment: "Yeah, the class was really good! I liked it.",
    renewal_conference: "Yeah, Tyler's been really enjoying it. I'm glad we tried it.",
    cancellation_save: "Hi, I'm calling because I need to cancel Cameron's membership.",
  };

  const scenarioVoices = {
    new_student:         { provider: "vapi", voiceId: "Elliot" },    // Jordan — male
    parent_enrollment:   { provider: "vapi", voiceId: "Emma" },      // Sarah — female
    web_lead_callback:   { provider: "vapi", voiceId: "Rohan" },     // Alex — male
    sales_enrollment:    { provider: "vapi", voiceId: "Nico" },      // Marcus — male
    renewal_conference:  { provider: "vapi", voiceId: "Savannah" },  // Lisa — female
    cancellation_save:   { provider: "vapi", voiceId: "Clara" },     // Karen — female
  };

  const destinationAssistant = {
    model: {
      provider: "openai",
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt }],
    },
    voice: scenarioVoices[scenario] || { provider: "vapi", voiceId: "Elliot" },
    firstMessage: firstMessages[scenario] ?? "Hello?",
    silenceTimeoutSeconds: 30,
    maxDurationSeconds: 600,
    serverMessages: [
      "end-of-call-report",
      "status-update",
      "conversation-update",
      "hang",
    ],
  };

  // Wire the destination assistant to our webhook so end-of-call-report fires
  // after the handoff. Without this, Vapi has no server URL for the new assistant.
  if (ENV.vapiWebhookUrl) {
    destinationAssistant.server = {
      url: ENV.vapiWebhookUrl,
      timeoutSeconds: 20,
    };
  } else {
    console.warn("[Vapi] VAPI_WEBHOOK_URL not set — destination assistant has no webhook URL, end-of-call-report will not fire");
  }

  const response = {
    destination: {
      type: "assistant",
      assistantName: scenarioTitle,
      description: `Training scenario: ${scenarioTitle} (${difficulty})`,
      assistant: destinationAssistant,
    },
  };

  res.json(response);
}

async function handleEndOfCallReport(message, res) {
  const call = message.call;
  const artifact = message.artifact;
  const vapiCallId = call?.id;
  const endedReason = message?.endedReason || call?.endedReason;

  console.log(`[Vapi] end-of-call-report for vapiCallId=${vapiCallId} endedReason=${endedReason}`);

  if (!vapiCallId) {
    console.warn("[Vapi] end-of-call-report missing call.id");
    return res.json({});
  }

  let dbCall = await getCallByVapiId(vapiCallId);

  if (!dbCall) {
    console.log(`[Vapi] No DB record for vapiCallId=${vapiCallId}, skipping`);
    clearCallContext(vapiCallId);
    return res.json({});
  }

  console.log(`[Vapi] Matched DB call id=${dbCall.id} (vapiCallId=${vapiCallId}) — updating to completed`);

  const messages = artifact?.messages || [];
  const turns = [];
  const transcriptLines = [];

  for (const msg of messages) {
    if (msg.role === "user" && msg.message) {
      turns.push({ role: "staff", text: msg.message, timestamp: msg.time || null });
      transcriptLines.push(`Staff: ${msg.message}`);
    } else if (msg.role === "bot" && msg.message) {
      turns.push({ role: "prospect", text: msg.message, timestamp: msg.time || null });
      transcriptLines.push(`Prospect (AI): ${msg.message}`);
    }
  }

  const transcript = transcriptLines.join("\n");
  const startedAtRaw = message.startedAt || call.startedAt || artifact?.startedAt || null;
  const endedAtRaw = message.endedAt || call.endedAt || artifact?.endedAt || null;
  const startedAt = startedAtRaw ? new Date(startedAtRaw) : null;
  const endedAt = endedAtRaw ? new Date(endedAtRaw) : null;
  let durationSeconds = startedAt && endedAt ? Math.round((endedAt - startedAt) / 1000) : null;
  if (!durationSeconds && typeof message.durationSeconds === "number") {
    durationSeconds = Math.round(message.durationSeconds);
  }

  await updateCall(dbCall.id, {
    status: "completed",
    transcription: transcript,
    transcriptTurns: turns,
    durationSeconds,
    recordingUrl: artifact?.recordingUrl || null,
  });

  console.log(`[Vapi] Call ${dbCall.id} completed, transcript: ${turns.length} turns, duration: ${durationSeconds}s`);

  if (transcript && transcript.trim().length >= 50) {
    triggerScoring(dbCall.id, transcript, dbCall.scenario).catch(console.error);
  }

  clearCallContext(vapiCallId);
  res.json({});
}

async function handleStatusUpdate(message, res) {
  const status = message.status;
  const call = message.call;
  const vapiCallId = call?.id;

  if (vapiCallId && status === "in-progress") {
    const dbCall = await getCallByVapiId(vapiCallId);
    if (dbCall) {
      await updateCall(dbCall.id, { status: "in_progress" });
    }
  }

  res.json({});
}

// ============================================
// Background scoring
// ============================================
async function triggerScoring(callDbId, transcript, scenario) {
  try {
    await updateCall(callDbId, { status: "scoring" });

    const scenarioTitle = SCENARIOS[scenario]?.title || "Training Call";
    const result = await scoreCallTranscript(transcript, scenarioTitle);

    await createScorecard({
      callId: callDbId,
      overallScore: result.overallScore,
      categories: result.categories,
      highlights: result.highlights,
      missedOpportunities: result.missedOpportunities,
      suggestions: result.suggestions,
      summary: result.summary,
    });

    await updateCall(callDbId, { status: "scored" });
    console.log(`[Vapi] Call ${callDbId} scored: ${result.overallScore}/100`);
  } catch (err) {
    console.error(`[Vapi] Scoring failed for call ${callDbId}:`, err);
    await updateCall(callDbId, { status: "completed" }).catch(() => {});
  }
}

export default router;
