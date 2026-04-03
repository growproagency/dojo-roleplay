import { describe, expect, it, vi } from "vitest";
import { SCENARIOS, getScenarioSystemPrompt } from "./scenarios";

// ─────────────────────────────────────────────────────────────────────────────
// Scenario registry tests
// ─────────────────────────────────────────────────────────────────────────────
describe("SCENARIOS registry", () => {
  it("includes all four scenarios including sales_enrollment", () => {
    expect(Object.keys(SCENARIOS)).toEqual(
      expect.arrayContaining(["new_student", "parent_enrollment", "web_lead_callback", "sales_enrollment"])
    );
  });

  it("sales_enrollment has required fields", () => {
    const s = SCENARIOS.sales_enrollment;
    expect(s.id).toBe("sales_enrollment");
    expect(s.title).toContain("Enrollment");
    expect(s.description).toBeTruthy();
    expect(s.systemPrompt).toBeTruthy();
  });

  it("sales_enrollment prompt mentions Jamie and trial class", () => {
    const prompt = SCENARIOS.sales_enrollment.systemPrompt;
    expect(prompt).toContain("Jamie");
    expect(prompt).toContain("trial");
  });

  it("sales_enrollment prompt includes pricing and commitment objections", () => {
    const prompt = SCENARIOS.sales_enrollment.systemPrompt;
    expect(prompt.toLowerCase()).toContain("pricing");
    expect(prompt.toLowerCase()).toContain("year");
  });

  it("sales_enrollment prompt includes Extended Time Guarantee reference", () => {
    const prompt = SCENARIOS.sales_enrollment.systemPrompt;
    expect(prompt).toContain("Extended Time Guarantee");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getScenarioSystemPrompt with school context
// ─────────────────────────────────────────────────────────────────────────────
describe("getScenarioSystemPrompt for sales_enrollment", () => {
  it("injects school name into sales enrollment prompt", () => {
    const prompt = getScenarioSystemPrompt("sales_enrollment", {
      schoolName: "Elite Martial Arts",
      city: "Orlando",
      state: "FL",
      introOffer: "2-week free trial",
      priceRangeLow: 149,
      priceRangeHigh: 199,
    });
    expect(prompt).toContain("Elite Martial Arts");
    expect(prompt).toContain("Orlando");
    expect(prompt).toContain("2-week free trial");
  });

  it("applies difficulty modifier to sales enrollment prompt", () => {
    const easyPrompt = getScenarioSystemPrompt("sales_enrollment", null, "easy");
    const hardPrompt = getScenarioSystemPrompt("sales_enrollment", null, "hard");
    expect(easyPrompt).toContain("Easy");
    expect(hardPrompt).toContain("Hard");
    expect(easyPrompt).not.toContain("Hard");
  });

  it("returns base prompt when no school context provided", () => {
    const withSchool = getScenarioSystemPrompt("sales_enrollment", null);
    const withoutSchool = getScenarioSystemPrompt("sales_enrollment");
    expect(withSchool).toBe(withoutSchool);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scoring engine: sales enrollment scenario detection
// ─────────────────────────────────────────────────────────────────────────────
vi.mock("./services/llm.js", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify({
            overallScore: 78,
            categories: [
              { name: "Needs Discovery (Go Fishing)", score: 8, feedback: "Asked about goals before pitching and redirected 'fun' answer." },
              { name: "Benefit Teaching (Over Time)", score: 8, feedback: "Connected discipline to long-term training." },
              { name: "Upgrade Pre-Frame", score: 7, feedback: "Referenced advanced students and mentioned nomination process." },
              { name: "Pricing Presentation", score: 7, feedback: "Walked through options and mentioned Extended Time Guarantee." },
              { name: "Objection Handling", score: 8, feedback: "Handled pricing objection well, explained value." },
              { name: "Closing Technique", score: 7, feedback: "Asked closing question and paused appropriately." },
            ],
            highlights: ["Let the parent speak first before pitching.", "Used 'over time' when explaining the benefit."],
            missedOpportunities: ["Did not ask 'Why is that important to you?' after identifying the benefit."],
            suggestions: ["After the parent names a benefit, always follow up with 'Why is that important to you?' to deepen emotional commitment."],
            summary: "Strong enrollment conference with good needs discovery. The upgrade pre-frame was effective. Focus on deepening the emotional 'why' in Step 1.",
          }),
        },
      },
    ],
  }),
}));

import { scoreCallTranscript } from "./scoring";

describe("scoreCallTranscript (sales enrollment)", () => {
  it("uses sales enrollment rubric when scenario title contains 'Enrollment'", async () => {
    const { invokeLLM } = await import("./services/llm.js");

    const result = await scoreCallTranscript(
      "Staff: So before I tell you about the program, tell me — what would you like to see your child accomplish?\nProspect (AI): Yeah, the class was really good! I liked it.\nStaff: Great! What specifically would you like to see them get out of it?",
      "Sales Enrollment Conference"
    );

    expect(result.overallScore).toBe(78);
    expect(result.categories).toHaveLength(6);
    expect(result.categories[0].name).toBe("Needs Discovery (Go Fishing)");

    // Verify the sales enrollment system prompt was used
    const callArgs = vi.mocked(invokeLLM).mock.calls[0]?.[0];
    expect(callArgs?.messages[0]?.content).toContain("4-Step Enrollment");
  });

  it("uses sales enrollment rubric when scenario title contains 'Conference'", async () => {
    const result = await scoreCallTranscript(
      "Staff: Jamie, what would you like to see your child accomplish?",
      "Sales Enrollment Conference"
    );
    expect(result.overallScore).toBe(78);
    expect(result.categories[0].name).toBe("Needs Discovery (Go Fishing)");
  });

  it("returns all required scorecard fields for sales enrollment", async () => {
    const result = await scoreCallTranscript(
      "Staff: Before I tell you about the program, tell me about your child...",
      "Sales Enrollment Conference"
    );
    expect(result).toHaveProperty("overallScore");
    expect(result).toHaveProperty("categories");
    expect(result).toHaveProperty("highlights");
    expect(result).toHaveProperty("missedOpportunities");
    expect(result).toHaveProperty("suggestions");
    expect(result).toHaveProperty("summary");
  });
});
