import { describe, expect, it } from "vitest";

import { parseQuizText } from "@/lib/quiz-import";

describe("parseQuizText", () => {
  it("reads single, multiple and true/false questions", () => {
    const { questions, errors } = parseQuizText(`
Q: Quel est le premier pilier de l'islam ?
- [x] La Shahada
- [ ] Le jeûne
Explication: La Shahada est le témoignage de foi.

Q: Quels sont des piliers de l'islam ?
- [x] La prière
- [x] La zakat
- [ ] La lecture

Q: Les piliers de la foi sont au nombre de six.
- [x] Vrai
- [ ] Faux
`);

    expect(errors).toEqual([]);
    expect(questions).toEqual([
      {
        prompt: "Quel est le premier pilier de l'islam ?",
        type: "qcm",
        explanation: "La Shahada est le témoignage de foi.",
        choix: [
          { label: "La Shahada", isCorrect: true },
          { label: "Le jeûne", isCorrect: false },
        ],
      },
      {
        prompt: "Quels sont des piliers de l'islam ?",
        type: "qcm",
        explanation: "",
        choix: [
          { label: "La prière", isCorrect: true },
          { label: "La zakat", isCorrect: true },
          { label: "La lecture", isCorrect: false },
        ],
      },
      {
        prompt: "Les piliers de la foi sont au nombre de six.",
        type: "vrai_faux",
        explanation: "",
        choix: [
          { label: "Vrai", isCorrect: true },
          { label: "Faux", isCorrect: false },
        ],
      },
    ]);
  });

  it("tolerates Markdown decoration and surrounding text", () => {
    const { questions, errors } = parseQuizText(`Voici vos questions :

\`\`\`
**1. Q:** Combien y a-t-il de piliers ?
* [ ] Trois
* [X] Cinq
**Explication :** Ils sont cinq,
selon le hadith de Jibril.
\`\`\`

Bonne révision !`);

    expect(errors).toEqual([]);
    expect(questions).toHaveLength(1);
    expect(questions[0]).toMatchObject({
      prompt: "Combien y a-t-il de piliers ?",
      explanation: "Ils sont cinq, selon le hadith de Jibril.",
      choix: [
        { label: "Trois", isCorrect: false },
        { label: "Cinq", isCorrect: true },
      ],
    });
  });

  it("drops Markdown italics", () => {
    const { questions } = parseQuizText(`Q: D'où vient le mot *Aquida* ?
- [x] Du verbe *'aqada*
- [ ] Du mot *fiqh*
Explication: *Aquida* dérive de *'aqada*, nouer fermement.`);
    expect(questions[0]).toMatchObject({
      prompt: "D'où vient le mot Aquida ?",
      explanation: "Aquida dérive de 'aqada, nouer fermement.",
      choix: [
        { label: "Du verbe 'aqada", isCorrect: true },
        { label: "Du mot fiqh", isCorrect: false },
      ],
    });
  });

  it("joins a prompt written on several lines", () => {
    const { questions } = parseQuizText(`Q: Complète :
« La religion, c'est… »
- [x] le bon conseil
- [ ] la richesse`);
    expect(questions[0].prompt).toBe("Complète : « La religion, c'est… »");
  });

  it("normalizes true/false labels", () => {
    const { questions } = parseQuizText(`Q: Énoncé
- [ ] vrai.
- [x] FAUX`);
    expect(questions[0].type).toBe("vrai_faux");
    expect(questions[0].choix).toEqual([
      { label: "Vrai", isCorrect: false },
      { label: "Faux", isCorrect: true },
    ]);
  });

  it("reports malformed blocks and keeps the valid ones", () => {
    const { questions, errors } = parseQuizText(`Q: Sans bonne réponse
- [ ] A
- [ ] B

Q: Un seul choix
- [x] A

Q: Valide
- [x] A
- [ ] B

Q: Vrai/Faux à deux bonnes réponses
- [x] Vrai
- [x] Faux`);

    expect(questions.map((q) => q.prompt)).toEqual(["Valide"]);
    expect(errors).toEqual([
      { block: 1, message: "aucune bonne réponse cochée [x]." },
      { block: 2, message: "il faut au moins 2 choix." },
      {
        block: 4,
        message: "une question Vrai/Faux a exactement une bonne réponse.",
      },
    ]);
  });

  it("finds nothing in unrelated text", () => {
    expect(parseQuizText("Bonjour, voici un résumé du cours.")).toEqual({
      questions: [],
      errors: [],
    });
  });
});
