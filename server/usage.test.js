import { describe, it, expect, vi, beforeEach } from "vitest";
import { getUsageSummary, getUsageByUser } from "./db";

// ── mock the DB module ────────────────────────────────────────────────────────
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getUsageSummary: vi.fn(),
    getUsageByUser: vi.fn(),
  };
});

const MOCK_SUMMARY = {
  totalCalls: 42,
  completedCalls: 38,
  totalSeconds: 7560,
  totalMinutes: 126,
  estimatedCostUsd: 8.85,
  byScenario: [
    { scenario: "new_student", calls: 20, seconds: 3600, minutes: 60 },
    { scenario: "cancellation_save", calls: 12, seconds: 2160, minutes: 36 },
  ],
  byMonth: [
    { month: "2026-03", calls: 42, seconds: 7560, minutes: 126 },
  ],
};

const MOCK_BY_USER = [
  {
    userId: 1,
    userName: "Alice",
    email: "alice@example.com",
    totalCalls: 25,
    completedCalls: 23,
    totalSeconds: 4500,
    totalMinutes: 75,
    estimatedCostUsd: 5.27,
    avgScore: 82.5,
    lastCallAt: new Date("2026-03-27"),
  },
  {
    userId: 2,
    userName: "Bob",
    email: "bob@example.com",
    totalCalls: 17,
    completedCalls: 15,
    totalSeconds: 3060,
    totalMinutes: 51,
    estimatedCostUsd: 3.58,
    avgScore: 74.1,
    lastCallAt: new Date("2026-03-25"),
  },
];

describe("admin usage queries", () => {
  beforeEach(() => {
    vi.mocked(getUsageSummary).mockResolvedValue(MOCK_SUMMARY);
    vi.mocked(getUsageByUser).mockResolvedValue(MOCK_BY_USER);
  });

  it("getUsageSummary returns expected shape", async () => {
    const result = await getUsageSummary();
    expect(result.totalCalls).toBe(42);
    expect(result.totalMinutes).toBe(126);
    expect(result.estimatedCostUsd).toBe(8.85);
  });

  it("getUsageByUser returns expected data", async () => {
    const result = await getUsageByUser();
    expect(result).toHaveLength(2);
    expect(result[0].userName).toBe("Alice");
  });

  it("passes date filters to getUsageSummary", async () => {
    vi.mocked(getUsageSummary).mockClear();
    const from = new Date("2026-03-01T00:00:00.000Z");
    const to = new Date("2026-03-31T23:59:59.000Z");
    await getUsageSummary(from, to);
    expect(vi.mocked(getUsageSummary)).toHaveBeenCalledWith(from, to);
  });

  it("byScenario rows have expected shape", async () => {
    const result = await getUsageSummary();
    const row = result.byScenario[0];
    expect(row).toHaveProperty("scenario");
    expect(row).toHaveProperty("calls");
    expect(row).toHaveProperty("seconds");
    expect(row).toHaveProperty("minutes");
  });

  it("byMonth rows have expected shape", async () => {
    const result = await getUsageSummary();
    const row = result.byMonth[0];
    expect(row).toHaveProperty("month");
    expect(row).toHaveProperty("calls");
    expect(row).toHaveProperty("minutes");
  });
});
