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
  vapiPhoneNumberId: process.env.VAPI_PHONE_NUMBER_ID || "",
  vapiPhoneNumber: process.env.VAPI_PHONE_NUMBER || "",
};
