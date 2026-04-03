import { describe, expect, it, vi } from "vitest";
import { SCENARIOS, getScenarioSystemPrompt } from "./scenarios";

// ─────────────────────────────────────────────────────────────────────────────
// Scenario registry tests
// ─────────────────────────────────────────────────────────────────────────────
describe("SCENARIOS registry", () => {
  it("includes all six scenarios including cancellation_save", () => {
    expect(Object.keys(SCENARIOS)).toEqual(
      expect.arrayContaining([
        "new_student",
        "parent_enrollment",
        "web_lead_callback",
        "sales_enrollment",
        "renewal_conference",
        "cancellation_save",
      ])
    );
  });

  it("cancellation_save has required fields", () => {
    const s = SCENARIOS.cancellation_save;
    expect(s.id).toBe("cancellation_save");
    expect(s.title).toContain("Cancellation");
    expect(s.description).toBeTruthy();
    expect(s.systemPrompt).toBeTruthy();
  });

  it("cancellation_save prompt mentions Morgan and Cameron", () => {
    const prompt = SCENARIOS.cancellation_save.systemPrompt;
    expect(prompt).toContain("Morgan");
    expect(prompt).toContain("Cameron");
  });

  it("cancellation_save prompt includes the Universal Opening cue", () => {
    const prompt = SCENARIOS.cancellation_save.systemPrompt;
    expect(prompt.toLowerCase()).toContain("before i do anything");
  });

  it("cancellation_save prompt includes Extended Time Guarantee reaction", () => {
    const prompt = SCENARIOS.cancellation_save.systemPrompt;
    expect(prompt.toLowerCase()).toContain("extended time guarantee");
  });

  it("cancellation_save prompt includes all three difficulty-based reasons", () => {
    const prompt = SCENARIOS.cancellation_save.systemPrompt;
    expect(prompt.toLowerCase()).toContain("schedule");
    expect(prompt.toLowerCase()).toContain("cost");
    expect(prompt.toLowerCase()).toContain("lost interest");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getScenarioSystemPrompt with school context
// ─────────────────────────────────────────────────────────────────────────────
describe("getScenarioSystemPrompt for cancellation_save", () => {
  it("injects school name into cancellation prompt", () => {
    const prompt = getScenarioSystemPrompt("cancellation_save", {
      schoolName: "Elite Martial Arts",
      city: "Orlando",
      state: "FL",
    });
    expect(prompt).toContain("Elite Martial Arts");
    expect(prompt).toContain("Orlando");
  });

  it("applies difficulty modifier to cancellation prompt", () => {
    const easyPrompt = getScenarioSystemPrompt("cancellation_save", null, "easy");
    const hardPrompt = getScenarioSystemPrompt("cancellation_save", null, "hard");
    expect(easyPrompt).toContain("Difficulty: Easy");
    expect(hardPrompt).toContain("Difficulty: Hard");
    expect(easyPrompt).not.toContain("Difficulty: Hard");
  });

  it("returns same base prompt with null or undefined school context", () => {
    const withNull = getScenarioSystemPrompt("cancellation_save", null);
    const withUndefined = getScenarioSystemPrompt("cancellation_save");
    expect(withNull).toBe(withUndefined);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scoring engine: cancellation save scenario detection
// ─────────────────────────────────────────────────────────────────────────────
vi.mock("./services/llm.js", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify({
            overallScore: 78,
            categories: [
              { name: "Universal Opening", score: 9, feedback: "Thanked the parent and asked questions before touching the system." },
              { name: "Reason Discovery", score: 8, feedback: "Asked open-ended questions and let the parent explain fully." },
              { name: "Save Strategy", score: 7, feedback: "Deployed the schedule change offer correctly for the schedule objection." },
              { name: "ETG Deployment", score: 7, feedback: "Explained the Extended Time Guarantee clearly and at the right moment." },
              { name: "Close or Exit Quality", score: 8, feedback: "Offered a concrete next step and got a verbal commitment." },
            ],
            highlights: [
              "Said 'Before I do anything in the system, can I ask you a couple of questions?' — this is the exact Universal Opening from the SOP.",
              "Offered two specific alternative class times rather than asking open-endedly when they could come in.",
            ],
            missedOpportunities: [
              "Did not reconnect the parent to Cameron's progress before offering the schedule change — the emotional reconnect makes the save stickier.",
            ],
            suggestions: [
              "After the parent reveals the reason, pause and say 'I'm really glad you told me that' before moving into any solution — it signals you heard them.",
            ],
            summary: "Strong cancellation save with an excellent Universal Opening and solid ETG deployment. The save strategy was appropriate for the schedule objection. Focus on the emotional reconnect step before presenting solutions to increase close rate.",
          }),
        },
      },
    ],
  }),
}));

import { scoreCallTranscript } from "./scoring";

describe("scoreCallTranscript (cancellation save)", () => {
  it("uses cancellation rubric when scenario title contains 'Cancellation'", async () => {
    const { invokeLLM } = await import("./services/llm.js");

    const result = await scoreCallTranscript(
      "Staff: Thank you for calling us directly — I really mean that. Before I do anything in the system, can I ask you a couple of questions?\nProspect (AI): Sure, I guess.\nStaff: How has Cameron been enjoying the program overall?",
      "Cancellation Save"
    );

    expect(result.overallScore).toBe(78);
    expect(result.categories).toHaveLength(5);
    expect(result.categories[0].name).toBe("Universal Opening");

    // Verify the cancellation system prompt was used
    const callArgs = vi.mocked(invokeLLM).mock.calls[0]?.[0];
    expect(callArgs?.messages[0]?.content).toContain("Universal Opening");
    expect(callArgs?.messages[0]?.content).toContain("Extended Time Guarantee");
  });

  it("does NOT use cancellation rubric for Renewal Conference", async () => {
    const { invokeLLM } = await import("./services/llm.js");
    vi.mocked(invokeLLM).mockClear();

    await scoreCallTranscript(
      "Staff: Hey Pat, I wanted to do a quick Progress Check on Tyler...",
      "Renewal Conference"
    );

    const callArgs = vi.mocked(invokeLLM).mock.calls[0]?.[0];
    expect(callArgs?.messages[0]?.content).toContain("4-Step Renewal");
    expect(callArgs?.messages[0]?.content).not.toContain("Universal Opening");
  });

  it("does NOT use cancellation rubric for Sales Enrollment Conference", async () => {
    const { invokeLLM } = await import("./services/llm.js");
    vi.mocked(invokeLLM).mockClear();

    await scoreCallTranscript(
      "Staff: Before I tell you about the program, tell me — what would you like your child to get out of it?",
      "Sales Enrollment Conference"
    );

    const callArgs = vi.mocked(invokeLLM).mock.calls[0]?.[0];
    expect(callArgs?.messages[0]?.content).toContain("4-Step Enrollment");
    expect(callArgs?.messages[0]?.content).not.toContain("Universal Opening");
  });

  it("returns all required scorecard fields for cancellation save", async () => {
    const result = await scoreCallTranscript(
      "Staff: Thank you for coming to us directly. Before I do anything, can I ask you a couple of questions?",
      "Cancellation Save"
    );
    expect(result).toHaveProperty("overallScore");
    expect(result).toHaveProperty("categories");
    expect(result).toHaveProperty("highlights");
    expect(result).toHaveProperty("missedOpportunities");
    expect(result).toHaveProperty("suggestions");
    expect(result).toHaveProperty("summary");
  });
});
