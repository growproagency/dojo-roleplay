import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the db module
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getSchoolSettings: vi.fn(),
    upsertSchoolSettings: vi.fn(),
  };
});

import { getSchoolSettings, upsertSchoolSettings } from "./db";

describe("settings.get", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getSchoolSettings returns undefined when no settings exist", async () => {
    vi.mocked(getSchoolSettings).mockResolvedValue(undefined);
    const result = await getSchoolSettings(42);
    expect(result).toBeUndefined();
    expect(getSchoolSettings).toHaveBeenCalledWith(42);
  });

  it("getSchoolSettings returns the settings record when it exists", async () => {
    const mockSettings = {
      id: 1,
      userId: 42,
      schoolName: "Tampa Martial Arts Academy",
      streetAddress: "123 Main St",
      city: "Tampa",
      state: "FL",
      zipCode: "33601",
      introOffer: "2-week free trial with free uniform",
      priceRangeLow: 99,
      priceRangeHigh: 199,
      programDirectorName: "Coach Mike",
      additionalNotes: "BJJ and Muay Thai",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    vi.mocked(getSchoolSettings).mockResolvedValue(mockSettings);
    const result = await getSchoolSettings(42);
    expect(result).toEqual(mockSettings);
  });
});

describe("settings.save", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("upsertSchoolSettings is called with the correct fields", async () => {
    vi.mocked(upsertSchoolSettings).mockResolvedValue(undefined);

    const data = {
      userId: 42,
      schoolName: "Tampa Martial Arts Academy",
      city: "Tampa",
      state: "FL",
      introOffer: "2-week free trial",
      priceRangeLow: 99,
      priceRangeHigh: 199,
    };

    await upsertSchoolSettings(data);

    expect(upsertSchoolSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 42,
        schoolName: "Tampa Martial Arts Academy",
        city: "Tampa",
        state: "FL",
      })
    );
  });
});
