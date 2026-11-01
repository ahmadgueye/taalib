import { z } from "zod";

// `id` : celui de la base, pour mettre à jour un élément existant au lieu de
// le recréer (et garder les réponses des élèves qui s'y rattachent).
export const choixSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().trim().min(1, "Chaque choix doit avoir un intitulé."),
  isCorrect: z.boolean(),
});

export const questionSchema = z
  .object({
    id: z.string().uuid().optional(),
    prompt: z.string().trim().min(1, "Chaque question doit avoir un énoncé."),
    type: z.enum(["qcm", "vrai_faux"]),
    explanation: z.string().trim().optional(),
    choix: z
      .array(choixSchema)
      .min(2, "Chaque question doit avoir au moins 2 choix."),
  })
  .refine((q) => q.choix.some((c) => c.isCorrect), {
    message: "Chaque question doit avoir au moins une bonne réponse.",
  })
  .refine(
    (q) =>
      q.type !== "vrai_faux" ||
      q.choix.filter((c) => c.isCorrect).length === 1,
    {
      message: "Une question Vrai/Faux doit avoir exactement une bonne réponse.",
    }
  );

export const questionsSchema = z
  .array(questionSchema)
  .min(1, "Ajoutez au moins une question.");
