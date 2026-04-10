import "dotenv/config";

export const ENV = {
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",

  // Supabase
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",

  // LLM (OpenAI-compatible endpoint)
  llmApiUrl: process.env.LLM_API_URL || "https://api.openai.com/v1/chat/completions",
  llmApiKey: process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || "",
  llmModel: process.env.LLM_MODEL || "gpt-4o-mini",

  // Vapi
  vapiApiKey: process.env.VAPI_API_KEY || "",
  vapiPublicKey: process.env.VAPI_PUBLIC_KEY || "",
  vapiAssistantId: process.env.VAPI_ASSISTANT_ID || "",
  vapiPhoneNumberId: process.env.VAPI_PHONE_NUMBER_ID || "",
  vapiPhoneNumber: process.env.VAPI_PHONE_NUMBER || "",
  // Secret used to sign short-lived session tokens that the client passes
  // to vapi.start() as metadata. Webhook verifies the signature.
  vapiSessionSecret: process.env.VAPI_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "dev-only-secret-do-not-use-in-prod",

  // Multi-tenancy fallback (used by Vapi webhook when no tenant context is found)
  defaultSchoolId: process.env.DEFAULT_SCHOOL_ID ? parseInt(process.env.DEFAULT_SCHOOL_ID, 10) : null,
  defaultUserId: process.env.DEFAULT_USER_ID ? parseInt(process.env.DEFAULT_USER_ID, 10) : null,

  // Public URL of this server's Vapi webhook (used in dynamic destination assistant config
  // so that end-of-call-report and other server events fire after a handoff).
  vapiWebhookUrl: process.env.VAPI_WEBHOOK_URL || "",
};
