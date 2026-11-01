import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

import { questionSchema } from "@/lib/actions/quiz-questions.schema";
import { usageCost } from "@/lib/quiz-generation-cost";
import type { ImportedQuestion } from "@/lib/quiz-import";

// Server-only : génère des questions de quiz à partir des leçons écrites
// d'une thématique, avec Claude. Lit ANTHROPIC_API_KEY, qui ne doit jamais
// arriver côté navigateur. Sans clé, la génération n'est pas proposée.

export const QUIZ_GENERATION_MODEL = "claude-opus-5-5";
export const MIN_QUESTIONS = 3;
export const MAX_QUESTIONS = 20;
// Environ 100 000 tokens : bien plus que les leçons d'une thématique.
const MAX_SOURCE_CHARS = 400_000;

export function isQuizGenerationEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const SYSTEM_PROMPT = `Tu es un enseignant qui prépare des quiz pour les étudiants d'une école d'enseignement islamique en ligne.

On te donne une ou plusieurs leçons. Tu écris des questions qui vérifient que l'étudiant a compris et retenu ces leçons.

Règles :
- Appuie-toi uniquement sur le contenu des leçons fournies. N'ajoute aucune information, aucun avis ni aucune référence qui n'y figure pas. Si une notion est ambiguë dans la leçon, ne pose pas de question dessus.
- Couvre l'ensemble des leçons plutôt qu'un seul passage, et privilégie les notions importantes aux détails anecdotiques.
- Mélange des questions à une seule bonne réponse, à plusieurs bonnes réponses, et des Vrai/Faux.
- QCM ("qcm") : 3 ou 4 choix, avec des mauvaises réponses plausibles. Indique toutes les bonnes réponses.
- Vrai/Faux ("vrai_faux") : exactement deux choix, « Vrai » puis « Faux », dont un seul correct.
- L'explication dit en une ou deux phrases pourquoi la réponse est correcte, d'après la leçon.
- Écris en français, en texte simple, sans Markdown. Conserve les termes arabes tels qu'ils sont écrits dans la leçon.`;

const outputSchema = z.object({
  questions: z.array(
    z.object({
      prompt: z.string(),
      type: z.enum(["qcm", "vrai_faux"]),
      explanation: z.string(),
      choix: z.array(z.object({ label: z.string(), isCorrect: z.boolean() })),
    })
  ),
});

export type GenerationLesson = { title: string; content: string };

// `cost` : coût réel en dollars, d'après les tokens consommés (approximatif
// si l'API a dû passer par le modèle de repli).
export type GenerationResult =
  | { questions: ImportedQuestion[]; dropped: number; cost: number }
  | { error: string };

function buildUserMessage(
  lessons: GenerationLesson[],
  count: number,
  instructions: string
) {
  const sources = lessons
    .map(
      (l) =>
        `<lecon titre="${l.title.replace(/"/g, "'")}">\n${l.content.trim()}\n</lecon>`
    )
    .join("\n\n");
  const extra = instructions.trim()
    ? `\n\nConsigne de l'enseignant : ${instructions.trim()}`
    : "";
  return `${sources}\n\nÉcris ${count} questions de quiz sur ces leçons.${extra}`;
}

// Garde les questions qui respectent les règles de l'éditeur (comme à
// l'import) et remet « Vrai » et « Faux » dans l'ordre habituel.
export function keepValidQuestions(
  raw: z.infer<typeof outputSchema>["questions"]
) {
  const questions: ImportedQuestion[] = [];
  for (const q of raw) {
    const choix =
      q.type === "vrai_faux"
        ? [...q.choix].sort((a, b) =>
            a.label.trim().toLowerCase() === "vrai"
              ? -1
              : b.label.trim().toLowerCase() === "vrai"
                ? 1
                : 0
          )
        : q.choix;
    const candidate = {
      prompt: q.prompt.trim(),
      type: q.type,
      explanation: q.explanation.trim(),
      choix: choix.map((c) => ({
        label: c.label.trim(),
        isCorrect: c.isCorrect,
      })),
    };
    const labels = candidate.choix.map((c) => c.label.toLowerCase()).sort();
    const trueFalseOk =
      q.type !== "vrai_faux" ||
      (labels.length === 2 && labels[0] === "faux" && labels[1] === "vrai");
    if (trueFalseOk && questionSchema.safeParse(candidate).success) {
      questions.push(candidate);
    }
  }
  return { questions, dropped: raw.length - questions.length };
}

export async function generateQuestions({
  lessons,
  count,
  instructions,
}: {
  lessons: GenerationLesson[];
  count: number;
  instructions: string;
}): Promise<GenerationResult> {
  const size = lessons.reduce((n, l) => n + l.content.length, 0);
  if (size === 0) return { error: "Les leçons choisies sont vides." };
  if (size > MAX_SOURCE_CHARS) {
    return {
      error: "Les leçons choisies sont trop longues. Choisis-en moins.",
    };
  }

  const client = new Anthropic();
  try {
    const response = await client.beta.messages.parse({
      model: QUIZ_GENERATION_MODEL,
      max_tokens: 16000,
      // Si le modèle refuse la demande, l'API la relance sur le modèle de
      // repli recommandé par Anthropic.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildUserMessage(lessons, count, instructions),
        },
      ],
      output_config: {
        effort: "medium",
        format: betaZodOutputFormat(outputSchema),
      },
    });

    if (response.stop_reason === "refusal") {
      return { error: "Le modèle a refusé de générer ces questions." };
    }
    if (response.stop_reason === "max_tokens" || !response.parsed_output) {
      return {
        error:
          "La réponse du modèle est incomplète. Réessaie avec moins de questions.",
      };
    }
    const result = keepValidQuestions(response.parsed_output.questions);
    if (result.questions.length === 0) {
      return { error: "Aucune question exploitable. Réessaie." };
    }
    return { ...result, cost: usageCost(response.usage) };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return { error: "Clé API Anthropic invalide." };
    }
    if (error instanceof Anthropic.RateLimitError) {
      return { error: "Trop de demandes. Réessaie dans une minute." };
    }
    if (error instanceof Anthropic.APIError) {
      // Crédit épuisé, service indisponible…
      console.error("Quiz generation failed", error.status, error.message);
      return {
        error: "La génération a échoué. Vérifie le crédit API, puis réessaie.",
      };
    }
    throw error;
  }
}
