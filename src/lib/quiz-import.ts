import type { QuestionType } from "@/lib/quiz-drafts";

// Import de questions collées depuis un texte, typiquement la réponse du
// chat de NotebookLM au prompt ci-dessous. Format :
//
//   Q: Quel est le premier pilier de l'islam ?
//   - [x] La Shahada
//   - [ ] Le jeûne
//   Explication: La Shahada est le témoignage de foi.
//
// Plusieurs [x] : réponses multiples. Deux choix « Vrai » et « Faux » :
// question Vrai/Faux. Le texte autour des questions est ignoré.

export const QUIZ_IMPORT_PROMPT = `À partir de mes sources, génère 10 questions de quiz sur [le sujet ou le chapitre].

Réponds uniquement avec les questions, sans introduction ni conclusion, en respectant exactement ce format :

Q: [énoncé de la question]
- [x] [bonne réponse]
- [ ] [mauvaise réponse]
- [ ] [mauvaise réponse]
Explication: [pourquoi c'est la bonne réponse, en une ou deux phrases]

Règles :
- Commence chaque question par « Q: » et laisse une ligne vide entre deux questions.
- Coche les bonnes réponses avec [x] et les mauvaises avec [ ].
- Une question peut avoir plusieurs bonnes réponses : coche-les toutes.
- Pour une question Vrai/Faux, donne exactement deux choix, « Vrai » et « Faux ».
- Mélange des questions à une seule bonne réponse, à plusieurs bonnes réponses et des Vrai/Faux.
- Écris en français.`;

export type ImportedQuestion = {
  prompt: string;
  type: QuestionType;
  explanation: string;
  choix: { label: string; isCorrect: boolean }[];
};

export type ImportResult = {
  questions: ImportedQuestion[];
  // Bloc n (1 pour la première question du texte) mal formé : ignoré.
  errors: { block: number; message: string }[];
};

// Retire les décorations Markdown qu'un modèle ajoute volontiers : gras,
// italique, puces, numérotation (« **1. Q:** », « 3) Q : », « *Aquida* »…).
function clean(line: string) {
  return line
    .replace(/\*\*|__/g, "")
    .replace(/^\s*(?:[-*•]\s+|\d+\s*[.)]\s*)?/, "")
    .replace(/\*([^*\s](?:[^*]*[^*\s])?)\*/g, "$1")
    .trim();
}

const questionLine = /^q\s*\d*\s*[:.)-]\s*(.*)$/i;
const choiceLine = /^\[([ xX✓✔])\]\s*(.+)$/;
const explanationLine = /^explication\s*:\s*(.*)$/i;

function normalize(label: string) {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[.!]/g, "")
    .trim();
}

function isTrueFalse(choix: { label: string }[]) {
  if (choix.length !== 2) return false;
  const labels = choix.map((c) => normalize(c.label)).sort();
  return labels[0] === "faux" && labels[1] === "vrai";
}

type Block = {
  prompt: string[];
  choix: { label: string; isCorrect: boolean }[];
  explanation: string[];
};

export function parseQuizText(text: string): ImportResult {
  const blocks: Block[] = [];
  let current: Block | null = null;
  // Où rattacher une ligne de suite : énoncé ou explication sur plusieurs
  // lignes.
  let continuing: "prompt" | "explanation" | null = null;

  for (const raw of text.split(/\r?\n/)) {
    if (/^\s*```/.test(raw)) continue;
    const line = clean(raw);
    if (!line) {
      continuing = null;
      continue;
    }

    const q = line.match(questionLine);
    if (q) {
      current = { prompt: [q[1]], choix: [], explanation: [] };
      blocks.push(current);
      continuing = "prompt";
      continue;
    }
    if (!current) continue;

    const c = line.match(choiceLine);
    if (c) {
      current.choix.push({ label: c[2].trim(), isCorrect: c[1] !== " " });
      continuing = null;
      continue;
    }

    const e = line.match(explanationLine);
    if (e) {
      current.explanation.push(e[1]);
      continuing = "explanation";
      continue;
    }

    if (continuing) current[continuing].push(line);
  }

  const result: ImportResult = { questions: [], errors: [] };
  blocks.forEach((block, index) => {
    const prompt = block.prompt.join(" ").trim();
    const correct = block.choix.filter((c) => c.isCorrect).length;
    const trueFalse = isTrueFalse(block.choix);

    let message: string | null = null;
    if (!prompt) message = "énoncé manquant.";
    else if (block.choix.length < 2) message = "il faut au moins 2 choix.";
    else if (correct === 0) message = "aucune bonne réponse cochée [x].";
    else if (trueFalse && correct !== 1)
      message = "une question Vrai/Faux a exactement une bonne réponse.";

    if (message) {
      result.errors.push({ block: index + 1, message });
      return;
    }

    result.questions.push({
      prompt,
      type: trueFalse ? "vrai_faux" : "qcm",
      explanation: block.explanation.join(" ").trim(),
      choix: trueFalse
        ? block.choix.map((c) => ({
            label: normalize(c.label) === "vrai" ? "Vrai" : "Faux",
            isCorrect: c.isCorrect,
          }))
        : block.choix,
    });
  });

  return result;
}
