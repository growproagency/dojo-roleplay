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

export function estimateScoringCostUsd({ model, promptTokens, completionTokens }) {
  if (!model || promptTokens == null || completionTokens == null) return null;
  const p = OPENAI_PRICING[model];
  if (!p) return null;
  return promptTokens * p.input + completionTokens * p.output;
}
