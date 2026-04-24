// User-facing training scripts per scenario rubric.
// Content mirrors the grading rubrics in server/scoring.js, rewritten from
// "Did they...?" grading voice into direct-instruction voice.

export const TRAINING_SCRIPTS = {
  inbound: {
    title: "13-Step Inbound Call Script",
    steps: [
      {
        num: 1,
        title: "Greeting",
        detail: 'Answer with energy. Say something like "It\'s a GREAT day at [School Name], may I ask who I am speaking with?" Get both first AND last name.',
      },
      {
        num: 2,
        title: "Identify the Caller",
        detail: 'Ask "Are you calling for yourself or your child?" If for a child, ask the child\'s age.',
      },
      {
        num: 3,
        title: "Confirm Location",
        detail: "Confirm which location the caller is interested in.",
      },
      {
        num: 4,
        title: "Determine Lead Source",
        detail: 'Ask "May I ask how you heard about us?" — helps track marketing effectiveness.',
      },
      {
        num: 5,
        title: "Identify Desired Benefits (WHY)",
        detail: 'Ask what benefits the caller hopes to gain. If the answer is vague, probe deeper: "What specific benefits are you hoping to gain?"',
      },
      {
        num: 6,
        title: "Current Efforts",
        detail: "Ask if the caller is currently doing anything to achieve those benefits — previous gym, sports, training.",
      },
      {
        num: 7,
        title: "Position the School",
        detail: "Explain why your school is the best fit, address the caller's specific WHY, and share your USP enthusiastically.",
      },
      {
        num: 8,
        title: "Present the Offer",
        detail: "Mention a free trial class, intro offer, or special program. Transition smoothly toward booking.",
      },
      {
        num: 9,
        title: "Schedule the Appointment",
        detail: 'Offer SPECIFIC time slots ("I have tonight at 6 or tomorrow at 7 — which works better?"). Don\'t ask open-ended "when can you come in?"',
      },
      {
        num: 10,
        title: "Gather Information",
        detail: "Collect full name, email, phone number, and age of the potential student. Verify accuracy by repeating it back.",
      },
      {
        num: 11,
        title: "Ask for Referrals",
        detail: 'Ask "Do you have any friends who may also be interested?"',
      },
      {
        num: 12,
        title: "Pre-Frame the Sign-Up",
        detail: 'Say something like "When you visit, if you like what you see, we can get you signed up — fair enough?"',
      },
      {
        num: 13,
        title: "Provide Next Steps",
        detail: "Confirm what to wear (workout clothes), what to bring (ID), and give logistical details (parking, arrival time).",
      },
    ],
  },

  outbound: {
    title: "12-Step Outbound Callback Script",
    steps: [
      {
        num: 1,
        title: "Warm Introduction",
        detail: 'Introduce yourself and the school clearly and warmly. "Hi, this is [Name] from [School] — is this Alex?"',
      },
      {
        num: 2,
        title: "Reference the Form",
        detail: 'Reference that they submitted the form to establish context and credibility. "You came to us!" or "I saw you filled out our form."',
      },
      {
        num: 3,
        title: "Establish Rapport",
        detail: "Use their name, ask a genuine question, and build a human connection BEFORE pitching.",
      },
      {
        num: 4,
        title: "Identify WHY",
        detail: "Ask what they were hoping to get out of martial arts. Probe deeper if the answer is vague.",
      },
      {
        num: 5,
        title: "Handle Cold Open / Skepticism",
        detail: 'Stay warm and confident when they\'re guarded or say "I was just looking for info."',
      },
      {
        num: 6,
        title: "Position the School",
        detail: "Explain why your school is the right fit for their specific goals.",
      },
      {
        num: 7,
        title: "Present the Offer",
        detail: "Mention a free trial or intro offer to lower the barrier to entry.",
      },
      {
        num: 8,
        title: 'Handle "Think About It"',
        detail: 'If they stall, overcome it with a confident, low-pressure response. "I totally understand — that\'s actually why I want you to just come check it out first, no pressure."',
      },
      {
        num: 9,
        title: "Schedule the Appointment",
        detail: 'Offer SPECIFIC time slots ("tonight at 6 or tomorrow at 7") rather than open-ended "when can you come in?"',
      },
      {
        num: 10,
        title: "Gather Information",
        detail: "Confirm or collect name, email, phone, and any relevant details.",
      },
      {
        num: 11,
        title: "Pre-Frame the Visit",
        detail: 'Say "Just come check it out — no pressure, fair enough?"',
      },
      {
        num: 12,
        title: "Confirm Next Steps",
        detail: "Confirm what to wear, what to bring, and logistical details.",
      },
    ],
  },

  sales_enrollment: {
    title: "4-Step Enrollment Process",
    steps: [
      {
        num: 1,
        title: "Talk About the Student (Go Fishing)",
        detail:
          'Open by asking about the student\'s goals BEFORE talking about the program. Let them speak first. If the answer is vague (e.g. "fun"), redirect with Go Fishing to uncover a real pain point — confidence, discipline, focus, respect, or coordination. Ask "If you had to pick one, what would it be?" and "Why is that important to you?"',
      },
      {
        num: 2,
        title: "Teach the Benefit (Over Time)",
        detail:
          'Take the specific benefit named in Step 1 and explain HOW the program builds that skill over time. Use the phrase "over time" or connect results to long-term consistent training. Be specific to their benefit — not a generic speech.',
      },
      {
        num: 3,
        title: "Pre-Frame the Upgrade (Compare & Contrast)",
        detail:
          'Point to advanced students and explain the upgrade program: earned, not bought; nomination process; Yellow Belt evaluation; ~80% of students. Ask the commitment question: "What is your plan to help with [NAME]\'s [BENEFIT]?" and let them answer.',
      },
      {
        num: 4,
        title: "Present Pricing (Conversation, Not Presentation)",
        detail:
          'Walk through program options conversationally. Explain the Extended Time Guarantee. Lead with savings rather than monthly cost. Ask "Which option works best for your family?" and go silent. Handle pricing/schedule/commitment objections confidently without apologizing for the price.',
      },
    ],
  },

  renewal_conference: {
    title: "4-Step Renewal Process",
    steps: [
      {
        num: 1,
        title: "Book the Progress Check",
        detail:
          'Frame this as a "Progress Check" (not a sales call). Make the parent feel this is a structured, intentional moment. Avoid leading with the renewal or price.',
      },
      {
        num: 2,
        title: "Ask the 3 Questions",
        detail:
          'Ask all three in order, one at a time, and let the parent answer fully.\n• Q1: "How is [student] enjoying the program?"\n• Q2: "And how are YOU enjoying the program? What\'s the biggest thing you\'ve noticed at home?"\n• Q3: "Can you see how [student] can accomplish [SPECIFIC BENEFIT PARENT NAMED] over time — if we stay consistent?"\nUse the benefit the parent named in Q1/Q2 when asking Q3. Write down what they say.',
      },
      {
        num: 3,
        title: "Highlight Specific Progress",
        detail:
          'Share 1–2 specific, real observations about the student — not generic praise. Frame the progress around the benefit the parent named. Say something like "What you might not see from the sideline is…"',
      },
      {
        num: 4,
        title: "Present the Renewal",
        detail:
          'Ask for the renewal directly and confidently. "I\'d love to get them renewed today so there\'s no gap in their training." Go silent after asking. If they push back with "not ready for a year," explain the pricing lock-in or re-enrollment cost. If they\'re not ready today, lock in a specific follow-up date before ending.',
      },
    ],
  },

  cancellation_save: {
    title: "Cancellation Save Process",
    steps: [
      {
        num: 1,
        title: "Universal Opening",
        detail:
          'Thank the parent for coming to you directly. Say "Before I do anything in the system, can I ask you a couple of questions?" Stop talking and let them explain. Do NOT immediately process the cancellation.',
      },
      {
        num: 2,
        title: "Identify the Real Reason",
        detail:
          "Ask open-ended questions to uncover the true reason. Listen without interrupting, defending, or justifying. Probe deeper if the first answer is vague.",
      },
      {
        num: 3,
        title: "Deploy the Right Save Tool",
        detail:
          "Pick the approach that matches the reason:\n• Cost → acknowledge the stress, reconnect to progress, explain the Extended Time Guarantee (ETG).\n• Child lost interest → ask WHEN the shift happened, address that moment, offer instructor re-engagement.\n• Schedule → ask what times work, offer alternatives, explain ETG for busy stretches.\n• Moving → lead with empathy, offer a training summary, offer a school referral in the new area.\n• Other sport → reframe martial arts as cross-training, offer reduced schedule.\n• Bad experience → listen completely, acknowledge without defensiveness, escalate to owner if needed.\n• No results → get curious about expectations, offer a progress review with the instructor.\n• Summer break → lead with ETG immediately, explain the cost of canceling vs. staying.",
      },
      {
        num: 4,
        title: "Extended Time Guarantee (ETG)",
        detail:
          "Explain the ETG clearly when relevant: Payments continue. If the student misses 4+ consecutive weeks, that time is added to the end — they never lose what they paid for. Canceling means losing their current pricing and paying a re-enrollment fee to return.",
      },
      {
        num: 5,
        title: "Close or Graceful Exit",
        detail:
          "Offer a specific, concrete solution — schedule change, 30-day trial, instructor meeting, progress review. Ask for a commitment or follow-up date. If you can't save it, exit warmly and leave the door open.",
      },
    ],
  },
};

// Mirrors the keyword logic in scoreCallTranscript (server/scoring.js).
// Returns one of: inbound, outbound, sales_enrollment, renewal_conference, cancellation_save.
export function resolveScriptType(scenarioTitle) {
  const t = (scenarioTitle || "").toLowerCase();
  if (t.includes("cancellation")) return "cancellation_save";
  if (t.includes("renewal")) return "renewal_conference";
  if (t.includes("enrollment") || t.includes("conference")) return "sales_enrollment";
  if (t.includes("outbound") || t.includes("callback")) return "outbound";
  return "inbound";
}

export function resolveTrainingScript(scenarioTitle) {
  return TRAINING_SCRIPTS[resolveScriptType(scenarioTitle)] ?? TRAINING_SCRIPTS.inbound;
}
