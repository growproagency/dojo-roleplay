import { describe, expect, it, vi } from "vitest";
import { SCENARIOS, getScenarioSystemPrompt } from "./scenarios";

// ─────────────────────────────────────────────────────────────────────────────
// Scenario registry tests
// ─────────────────────────────────────────────────────────────────────────────
describe("SCENARIOS registry", () => {
  it("includes all three scenarios", () => {
    expect(Object.keys(SCENARIOS)).toEqual(
      expect.arrayContaining(["new_student", "parent_enrollment", "web_lead_callback"])
    );
  });

  it("web_lead_callback has required fields", () => {
    const s = SCENARIOS.web_lead_callback;
    expect(s.id).toBe("web_lead_callback");
    expect(s.title).toContain("Outbound");
    expect(s.description).toBeTruthy();
    expect(s.systemPrompt).toBeTruthy();
  });

  it("web_lead_callback prompt mentions Alex and form submission", () => {
    const prompt = SCENARIOS.web_lead_callback.systemPrompt;
    expect(prompt).toContain("Alex");
    expect(prompt).toContain("form");
  });

  it("web_lead_callback prompt includes 'Think About It' objection", () => {
    const prompt = SCENARIOS.web_lead_callback.systemPrompt;
    expect(prompt.toLowerCase()).toContain("think about it");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getScenarioSystemPrompt with school context
// ─────────────────────────────────────────────────────────────────────────────
describe("getScenarioSystemPrompt", () => {
  it("injects school name into outbound prompt", () => {
    const prompt = getScenarioSystemPrompt("web_lead_callback", {
      schoolName: "Tampa Bay Martial Arts",
      city: "Tampa",
      state: "FL",
      introOffer: "2-week free trial",
    });
    expect(prompt).toContain("Tampa Bay Martial Arts");
    expect(prompt).toContain("Tampa");
    expect(prompt).toContain("2-week free trial");
  });

  it("returns base prompt when no school context provided", () => {
    const withSchool = getScenarioSystemPrompt("web_lead_callback", null);
    const withoutSchool = getScenarioSystemPrompt("web_lead_callback");
    expect(withSchool).toBe(withoutSchool);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scoring engine: outbound scenario detection
// ─────────────────────────────────────────────────────────────────────────────
vi.mock("./services/llm.js", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify({
            overallScore: 72,
            categories: [
              { name: "Rapport & Introduction", score: 8, feedback: "Good warm intro and referenced the form." },
              { name: "Needs Discovery", score: 7, feedback: "Asked about goals but didn't probe deeper." },
              { name: "School Positioning & Offer", score: 7, feedback: "Mentioned the free trial clearly." },
              { name: "Objection Handling", score: 6, feedback: "Handled 'think about it' but could be more confident." },
              { name: "Appointment Setting", score: 8, feedback: "Offered two specific time slots." },
              { name: "Information & Next Steps", score: 7, feedback: "Confirmed name and email." },
            ],
            highlights: ["Referenced the form submission immediately.", "Offered specific time slots."],
            missedOpportunities: ["Did not ask about current fitness habits."],
            suggestions: ["When Alex says 'let me think about it', respond with 'I totally understand — that's exactly why I want you to just come check it out first, no pressure. Fair enough?'"],
            summary: "Good outbound call with solid rapport. Main area to improve is handling the 'think about it' stall more confidently.",
          }),
        },
      },
    ],
  }),
}));

import { scoreCallTranscript } from "./scoring";

describe("scoreCallTranscript (outbound)", () => {
  it("uses outbound rubric when scenario title contains 'Outbound'", async () => {
    const { invokeLLM } = await import("./services/llm.js");

    const result = await scoreCallTranscript(
      "Staff: Hi, is this Alex?\nProspect (AI): Yeah, who's this?\nStaff: This is Mike from Tampa Bay Martial Arts. I saw you filled out our form...",
      "Outbound Web Lead Callback"
    );

    expect(result.overallScore).toBe(72);
    expect(result.categories).toHaveLength(6);
    expect(result.categories[0].name).toBe("Rapport & Introduction");

    // Verify the outbound system prompt was used (not the inbound one)
    const callArgs = vi.mocked(invokeLLM).mock.calls[0]?.[0];
    expect(callArgs?.messages[0]?.content).toContain("outbound callback");
  });

  it("returns all required scorecard fields", async () => {
    const result = await scoreCallTranscript(
      "Staff: Hi Alex, this is Mike...",
      "Outbound Web Lead Callback"
    );
    expect(result).toHaveProperty("overallScore");
    expect(result).toHaveProperty("categories");
    expect(result).toHaveProperty("highlights");
    expect(result).toHaveProperty("missedOpportunities");
    expect(result).toHaveProperty("suggestions");
    expect(result).toHaveProperty("summary");
  });
});
