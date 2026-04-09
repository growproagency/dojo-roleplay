import { Router } from "express";
import { getScenarioSystemPrompt, SCENARIOS } from "../scenarios.js";
import { scoreCallTranscript } from "../scoring.js";
import {
  createCall,
  updateCall,
  getCallByVapiId,
  getSchoolSettings,
  createScorecard,
} from "../db.js";

const router = Router();

// POST /api/vapi/webhook — single endpoint for all Vapi server events
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
        return handleAssistantRequest(message, res);

      case "tool-calls":
        return await handleToolCalls(message, res);

      case "handoff-destination-request":
        return await handleHandoffRequest(message, res);

      case "end-of-call-report":
        return await handleEndOfCallReport(message, res);

      case "status-update":
        return await handleStatusUpdate(message, res);

      default:
        // Acknowledge unknown events
        return res.json({});
    }
  } catch (err) {
    console.error(`[Vapi] Error handling ${eventType}:`, err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---- Event Handlers ----

function handleAssistantRequest(message, res) {
  // Return a "receptionist" assistant that routes callers to the right scenario
  const scenarioList = Object.values(SCENARIOS)
    .map(s => s.title)
    .join(", ");

  res.json({
    assistant: {
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
        provider: "openai",
        voiceId: "shimmer",
      },
      firstMessage:
        "Welcome to Dojo Roleplay! What scenario would you like to practice today? And would you like easy, medium, or hard difficulty?",
      tools: [
        {
          type: "function",
          function: {
            name: "startTrainingCall",
            description:
              "Start the training roleplay once the caller has selected a scenario and difficulty",
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
    },
  });
}

async function handleToolCalls(message, res) {
  const toolCalls = message.toolCallList || [];
  const call = message.call;
  const results = [];

  for (const toolCall of toolCalls) {
    if (toolCall.function?.name === "startTrainingCall") {
      const args = toolCall.function.arguments || {};
      const scenario = args.scenario;
      const difficulty = args.difficulty || "medium";

      if (!scenario || !SCENARIOS[scenario]) {
        results.push({ toolCallId: toolCall.id, result: "Invalid scenario. Please pick from: new_student, parent_enrollment, web_lead_callback, sales_enrollment, renewal_conference, cancellation_save." });
        continue;
      }

      const userId = 1;

      // Fetch school settings for prompt customization
      const settings = await getSchoolSettings(userId).catch(() => null);

      // Generate the full system prompt for the roleplay character
      const systemPrompt = getScenarioSystemPrompt(scenario, settings, difficulty);
      const scenarioTitle = SCENARIOS[scenario].title;

      // Create call record in DB
      const callDbId = await createCall({
        userId,
        scenario,
        difficulty,
        vapiCallId: call?.id || null,
        status: "in_progress",
      });

      console.log(`[Vapi] Starting training: scenario=${scenario}, difficulty=${difficulty}, callDbId=${callDbId}`);

      // Return the character instructions as the tool result
      // Riley will adopt this persona for the rest of the call
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
  console.log(`[Vapi] Handoff request payload:`, JSON.stringify(message, null, 2));
  const call = message.call;
  const vapiCallId = call?.id;
  const handoffData = message.parameters || message.toolCall?.function?.arguments || {};

  // Extract scenario/difficulty from the handoff tool arguments
  const scenario = handoffData.scenario || "new_student";
  const difficulty = handoffData.difficulty || "medium";

  if (!SCENARIOS[scenario]) {
    console.warn("[Vapi] handoff-destination-request: invalid scenario", scenario);
    return res.json({ error: "Invalid scenario" });
  }

  const userId = 1;

  // Create call record in DB
  const callDbId = await createCall({
    userId,
    scenario,
    difficulty,
    vapiCallId: vapiCallId || null,
    status: "in_progress",
  });

  // Fetch school settings for prompt customization
  const settings = await getSchoolSettings(userId).catch(() => null);

  // Generate the full system prompt
  const systemPrompt = getScenarioSystemPrompt(scenario, settings, difficulty);
  const scenarioTitle = SCENARIOS[scenario].title;

  console.log(`[Vapi] Handoff: scenario=${scenario}, difficulty=${difficulty}, callDbId=${callDbId}`);

  // First messages for each scenario (what the AI character says first)
  const firstMessages = {
    new_student: "Hey, I was just calling to get some info about your adult classes?",
    parent_enrollment: "Hi, yeah — I'm calling about your kids' program? I'm thinking about enrolling my son.",
    web_lead_callback: null, // Staff is calling the lead, so the AI answers "Hello?"
    sales_enrollment: "Yeah, the class was really good! I liked it.",
    renewal_conference: "Yeah, Tyler's been really enjoying it. I'm glad we tried it.",
    cancellation_save: "Hi, I'm calling because I need to cancel Cameron's membership.",
  };

  const response = {
    destination: {
      type: "assistant",
      assistantName: scenarioTitle,
      description: `Training scenario: ${scenarioTitle} (${difficulty})`,
      assistant: {
        model: {
          provider: "openai",
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
          ],
        },
        voice: {
          provider: "vapi",
          voiceId: "Elliot",
        },
        firstMessage: firstMessages[scenario] ?? "Hello?",
        silenceTimeoutSeconds: 30,
        maxDurationSeconds: 600,
      },
    },
  };

  console.log(`[Vapi] Handoff response:`, JSON.stringify(response).slice(0, 500));
  res.json(response);
}

async function handleEndOfCallReport(message, res) {
  const call = message.call;
  const artifact = message.artifact;
  const vapiCallId = call?.id;

  if (!vapiCallId) {
    console.warn("[Vapi] end-of-call-report missing call.id");
    return res.json({});
  }

  // Find the call in our DB
  let dbCall = await getCallByVapiId(vapiCallId);

  // If we don't have a record (e.g., receptionist-only call), skip scoring
  if (!dbCall) {
    console.log(`[Vapi] No DB record for call ${vapiCallId}, skipping`);
    return res.json({});
  }

  // Extract transcript from artifact.messages
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

  // Calculate duration
  const startedAt = call.startedAt ? new Date(call.startedAt) : null;
  const endedAt = call.endedAt ? new Date(call.endedAt) : null;
  const durationSeconds = startedAt && endedAt
    ? Math.round((endedAt - startedAt) / 1000)
    : null;

  // Update call record
  await updateCall(dbCall.id, {
    status: "completed",
    transcription: transcript,
    transcriptTurns: turns,
    durationSeconds,
    recordingUrl: artifact?.recordingUrl || null,
  });

  console.log(`[Vapi] Call ${dbCall.id} completed, transcript: ${turns.length} turns, duration: ${durationSeconds}s`);

  // Trigger scoring if transcript is long enough
  if (transcript && transcript.trim().length >= 50) {
    triggerScoring(dbCall.id, transcript, dbCall.scenario).catch(console.error);
  }

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

// ---- Background scoring ----

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
