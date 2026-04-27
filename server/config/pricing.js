// Centralized pricing constants. Update when OpenAI raises rates or we adopt
// a new model. All values are USD per single token.

export const OPENAI_PRICING = {
  "gpt-4o-mini":  { input: 0.15 / 1_000_000, output: 0.60 / 1_000_000 },
  "gpt-4o":       { input: 5.00 / 1_000_000, output: 15.00 / 1_000_000 },
  "gpt-4.1-mini": { input: 0.40 / 1_000_000, output: 1.60 / 1_000_000 },
  "gpt-4.1":      { input: 2.00 / 1_000_000, output: 8.00 / 1_000_000 },
};

// Used only for legacy calls/scorecards that have no recorded cost.
// ~$0.07/min — kept identical to the previous COST_PER_SECOND so historical
// totals don't suddenly change.
export const FALLBACK_COST_PER_SECOND = 0.00117;

// OpenAI returns dated snapshot model IDs like "gpt-4o-mini-2024-07-18".
// Strip the trailing -YYYY-MM-DD so they match our base-model pricing keys.
function normalizeModel(model) {
  if (!model) return null;
  return model.replace(/-\d{4}-\d{2}-\d{2}$/, "");
}

export function estimateScoringCostUsd({ model, promptTokens, completionTokens }) {
  if (!model || promptTokens == null || completionTokens == null) return null;
  const p = OPENAI_PRICING[model] ?? OPENAI_PRICING[normalizeModel(model)];
  if (!p) return null;
  return promptTokens * p.input + completionTokens * p.output;
}
