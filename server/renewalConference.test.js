import { describe, expect, it, vi } from "vitest";
import { SCENARIOS, getScenarioSystemPrompt } from "./scenarios";

// ─────────────────────────────────────────────────────────────────────────────
// Scenario registry tests
// ─────────────────────────────────────────────────────────────────────────────
describe("SCENARIOS registry", () => {
  it("includes all five scenarios including renewal_conference", () => {
    expect(Object.keys(SCENARIOS)).toEqual(
      expect.arrayContaining([
        "new_student",
        "parent_enrollment",
        "web_lead_callback",
        "sales_enrollment",
        "renewal_conference",
      ])
    );
  });

  it("renewal_conference has required fields", () => {
    const s = SCENARIOS.renewal_conference;
    expect(s.id).toBe("renewal_conference");
    expect(s.title).toContain("Renewal");
    expect(s.description).toBeTruthy();
    expect(s.systemPrompt).toBeTruthy();
  });

  it("renewal_conference prompt mentions Pat and Tyler", () => {
    const prompt = SCENARIOS.renewal_conference.systemPrompt;
    expect(prompt).toContain("Pat");
    expect(prompt).toContain("Tyler");
  });

  it("renewal_conference prompt includes the 3 Progress Check questions", () => {
    const prompt = SCENARIOS.renewal_conference.systemPrompt;
    expect(prompt.toLowerCase()).toContain("enjoying the program");
    expect(prompt.toLowerCase()).toContain("noticed at home");
    expect(prompt.toLowerCase()).toContain("consistent");
  });

  it("renewal_conference prompt includes commitment and pricing objections", () => {
    const prompt = SCENARIOS.renewal_conference.systemPrompt;
    expect(prompt.toLowerCase()).toContain("year");
    expect(prompt.toLowerCase()).toContain("pricing");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getScenarioSystemPrompt with school context
// ─────────────────────────────────────────────────────────────────────────────
describe("getScenarioSystemPrompt for renewal_conference", () => {
  it("injects school name into renewal prompt", () => {
    const prompt = getScenarioSystemPrompt("renewal_conference", {
      schoolName: "Champion Martial Arts",
      city: "Tampa",
      state: "FL",
      introOffer: "2-week free trial",
    });
    expect(prompt).toContain("Champion Martial Arts");
    expect(prompt).toContain("Tampa");
  });

  it("applies difficulty modifier to renewal prompt", () => {
    const easyPrompt = getScenarioSystemPrompt("renewal_conference", null, "easy");
    const hardPrompt = getScenarioSystemPrompt("renewal_conference", null, "hard");
    expect(easyPrompt).toContain("Easy");
    expect(hardPrompt).toContain("Hard");
    expect(easyPrompt).not.toContain("Hard");
  });

  it("returns base prompt when no school context provided", () => {
    const withNull = getScenarioSystemPrompt("renewal_conference", null);
    const withUndefined = getScenarioSystemPrompt("renewal_conference");
    expect(withNull).toBe(withUndefined);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scoring engine: renewal conference scenario detection
// ─────────────────────────────────────────────────────────────────────────────
vi.mock("./services/llm.js", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify({
            overallScore: 82,
            categories: [
              { name: "Progress Check Framing", score: 9, feedback: "Opened with a Progress Check frame, not a sales pitch." },
              { name: "The 3 Questions", score: 8, feedback: "Asked all three questions in order and used the parent's named benefit in Q3." },
              { name: "Specific Progress Highlight", score: 8, feedback: "Shared a specific belt test moment and connected it to focus." },
              { name: "Renewal Ask", score: 8, feedback: "Asked directly and went silent after the ask." },
              { name: "Objection Handling", score: 7, feedback: "Handled the year commitment objection by explaining pricing lock-in." },
              { name: "Follow-Up Discipline", score: 9, feedback: "Set a specific follow-up date before ending the call." },
            ],
            highlights: ["Used the parent's exact words when asking Q3.", "Shared a specific moment from class the parent didn't know about."],
            missedOpportunities: ["Did not write down what the parent said during Q2 — this signals you're taking it seriously."],
            suggestions: ["After the parent answers Q2, pause and say 'Let me write that down' — it shows you care and builds trust before the renewal ask."],
            summary: "Strong renewal conference with excellent framing and question flow. The specific progress highlight was effective. Focus on visibly noting what the parent shares to deepen the emotional connection.",
          }),
        },
      },
    ],
  }),
}));

import { scoreCallTranscript } from "./scoring";

describe("scoreCallTranscript (renewal conference)", () => {
  it("uses renewal rubric when scenario title contains 'Renewal'", async () => {
    const { invokeLLM } = await import("./services/llm.js");

    const result = await scoreCallTranscript(
      "Staff: Hey Pat, thanks for sitting down with me. I wanted to do a quick Progress Check on Tyler before we talk about anything else. How has Tyler been enjoying the program?\nProspect (AI): He loves it. He looks forward to every class.",
      "Renewal Conference"
    );

    expect(result.overallScore).toBe(82);
    expect(result.categories).toHaveLength(6);
    expect(result.categories[0].name).toBe("Progress Check Framing");

    // Verify the renewal system prompt was used (not sales enrollment or inbound)
    const callArgs = vi.mocked(invokeLLM).mock.calls[0]?.[0];
    expect(callArgs?.messages[0]?.content).toContain("4-Step Renewal");
  });

  it("does NOT use renewal rubric for Sales Enrollment Conference", async () => {
    const { invokeLLM } = await import("./services/llm.js");
    vi.mocked(invokeLLM).mockClear();

    await scoreCallTranscript(
      "Staff: Before I tell you about the program, tell me — what would you like your child to get out of it?",
      "Sales Enrollment Conference"
    );

    const callArgs = vi.mocked(invokeLLM).mock.calls[0]?.[0];
    // Should use the Sales Enrollment prompt, not the Renewal prompt
    expect(callArgs?.messages[0]?.content).toContain("4-Step Enrollment");
    expect(callArgs?.messages[0]?.content).not.toContain("4-Step Renewal");
  });

  it("returns all required scorecard fields for renewal conference", async () => {
    const result = await scoreCallTranscript(
      "Staff: Hey Pat, I wanted to do a quick Progress Check on Tyler...",
      "Renewal Conference"
    );
    expect(result).toHaveProperty("overallScore");
    expect(result).toHaveProperty("categories");
    expect(result).toHaveProperty("highlights");
    expect(result).toHaveProperty("missedOpportunities");
    expect(result).toHaveProperty("suggestions");
    expect(result).toHaveProperty("summary");
  });
});
