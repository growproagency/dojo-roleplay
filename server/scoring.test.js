import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the LLM module
vi.mock("./services/llm.js", () => ({
  invokeLLM: vi.fn(),
}));

import { scoreCallTranscript } from "./scoring";
import { invokeLLM } from "./services/llm.js";

const mockScorecardResponse = {
  overallScore: 72,
  categories: [
    { name: "Warm Greeting & Rapport", score: 8, feedback: "Great warm greeting, asked for the prospect's name." },
    { name: "Needs Discovery", score: 7, feedback: "Asked about goals but could have probed deeper." },
    { name: "Value Presentation", score: 7, feedback: "Mentioned key benefits but missed the fitness angle." },
    { name: "Objection Handling", score: 6, feedback: "Handled cost concern adequately but hesitated on commitment." },
    { name: "Appointment Setting", score: 8, feedback: "Successfully asked for and confirmed a trial class." },
    { name: "Urgency & Next Steps", score: 6, feedback: "Could have created more urgency around limited spots." },
  ],
  highlights: [
    "Opened with a warm, professional greeting and asked the prospect's name immediately.",
    "Successfully guided the conversation toward booking a trial class.",
  ],
  missedOpportunities: [
    "Did not ask about the prospect's specific fitness goals early in the call.",
    "Missed an opportunity to mention the free trial when cost was raised.",
  ],
  suggestions: [
    "Start with 'What brings you to call us today?' to open up the needs discovery phase.",
    "When cost comes up, immediately pivot to the free trial: 'We actually offer a complimentary first class — would that help you decide?'",
    "Close with a specific date and time: 'We have Tuesday at 6pm or Saturday at 10am — which works better for you?'",
  ],
  summary: "This was a solid call with good rapport and a successful booking. The main areas to improve are deeper needs discovery and more confident objection handling around cost.",
};

describe("scoreCallTranscript", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a structured scorecard from LLM response", async () => {
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify(mockScorecardResponse),
            role: "assistant",
          },
        },
      ],
    } as ReturnType<typeof invokeLLM> extends Promise<infer T> ? T : never);

    const result = await scoreCallTranscript(
      "Staff: Hello, thank you for calling Dojo Martial Arts, this is Alex!\nProspect (AI): Hi, I was calling to ask about your classes.",
      "New Student Inquiry"
    );

    expect(result.overallScore).toBe(72);
    expect(result.categories).toHaveLength(6);
    expect(result.highlights).toHaveLength(2);
    expect(result.missedOpportunities).toHaveLength(2);
    expect(result.suggestions).toHaveLength(3);
    expect(result.summary).toContain("solid call");
  });

  it("throws when LLM returns no content", async () => {
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [{ message: { content: null, role: "assistant" } }],
    } as ReturnType<typeof invokeLLM> extends Promise<infer T> ? T : never);

    await expect(
      scoreCallTranscript("Some transcript", "New Student Inquiry")
    ).rejects.toThrow("No scoring response from LLM");
  });

  it("calls invokeLLM with the correct scenario title in the prompt", async () => {
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify(mockScorecardResponse),
            role: "assistant",
          },
        },
      ],
    } as ReturnType<typeof invokeLLM> extends Promise<infer T> ? T : never);

    await scoreCallTranscript("Test transcript content here", "Parent Enrollment");

    const callArgs = vi.mocked(invokeLLM).mock.calls[0]?.[0];
    const userMessage = callArgs?.messages.find(m => m.role === "user");
    expect(typeof userMessage?.content === "string" && userMessage.content).toContain("Parent Enrollment");
  });
});
