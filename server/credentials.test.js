import { describe, expect, it } from "vitest";
import twilio from "twilio";
import { invokeLLM } from "./services/llm.js";

// Normalize phone number to E.164 format if missing leading +
function normalizePhone(phone: string): string {
  if (!phone.startsWith("+")) return `+${phone}`;
  return phone;
}

describe("Credential Validation", () => {
  it("Twilio credentials are valid and sub-account is accessible", async () => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    expect(accountSid, "TWILIO_ACCOUNT_SID must be set").toBeTruthy();
    expect(authToken, "TWILIO_AUTH_TOKEN must be set").toBeTruthy();

    const client = twilio(accountSid!, authToken!);
    const account = await client.api.accounts(accountSid!).fetch();

    expect(account.sid).toBe(accountSid);
    expect(["active", "suspended"]).toContain(account.status);
  }, 15000);

  it("LLM API is accessible", async () => {
    const result = await invokeLLM({
      messages: [
        { role: "user", content: "Reply with the single word: OK" },
      ],
    });
    const content = result.choices[0]?.message?.content;
    expect(content).toBeTruthy();
  }, 20000);

  it("Twilio phone number is configured and normalizable to E.164", () => {
    const rawPhone = process.env.TWILIO_PHONE_NUMBER;
    expect(rawPhone, "TWILIO_PHONE_NUMBER must be set").toBeTruthy();
    const normalized = normalizePhone(rawPhone!);
    expect(normalized).toMatch(/^\+\d{10,15}$/);
  });
});
