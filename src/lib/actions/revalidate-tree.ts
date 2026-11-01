import { revalidatePath } from "next/cache";

// Pages de l'arbre du dashboard (un cours et ses thématiques, une thématique
// et son contenu) : à rafraîchir dès qu'un de leurs éléments change.
export function revalidateCoursTree() {
  revalidatePath("/(dashboard)/dashboard/cours/[id]", "page");
  revalidatePath("/(dashboard)/dashboard/thematiques/[id]", "page");
}
