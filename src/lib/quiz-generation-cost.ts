// Coût d'une génération de quiz, utilisable côté navigateur (estimation avant
// l'appel) comme côté serveur (coût réel d'après les tokens consommés).

// Tarifs de claude-opus-5-5, en dollars par million de tokens.
const INPUT_PRICE = 4;
const OUTPUT_PRICE = 20;
const CACHE_WRITE_PRICE = INPUT_PRICE * 1.25;
const CACHE_READ_PRICE = 0.2;

// Ordres de grandeur observés : un mot de leçon en français (avec des termes
// arabes) fait environ 2 tokens ; une question générée (énoncé, choix,
// explication) environ 300, plus la réflexion du modèle.
const TOKENS_PER_WORD = 2.2;
const PROMPT_TOKENS = 1000;
const TOKENS_PER_QUESTION = 300;
const THINKING_TOKENS = 2000;
const THINKING_TOKENS_PER_QUESTION = 150;

export const ANTHROPIC_BILLING_URL =
  "https://console.anthropic.com/settings/billing";

export function estimateGenerationCost(words: number, count: number) {
  const input = PROMPT_TOKENS + words * TOKENS_PER_WORD;
  const output =
    count * (TOKENS_PER_QUESTION + THINKING_TOKENS_PER_QUESTION) +
    THINKING_TOKENS;
  return (input * INPUT_PRICE + output * OUTPUT_PRICE) / 1_000_000;
}

export type TokenUsage = {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
};

export function usageCost(usage: TokenUsage) {
  return (
    (usage.input_tokens * INPUT_PRICE +
      usage.output_tokens * OUTPUT_PRICE +
      (usage.cache_creation_input_tokens ?? 0) * CACHE_WRITE_PRICE +
      (usage.cache_read_input_tokens ?? 0) * CACHE_READ_PRICE) /
    1_000_000
  );
}

export function formatCost(dollars: number) {
  if (dollars < 0.01) return "moins de 0,01 $";
  return `${dollars.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} $`;
}
