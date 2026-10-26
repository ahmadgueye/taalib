// Ce qu'un utilisateur a le droit de voir dans le catalogue. Le staff
// (admin/contributor) voit tout ; un étudiant ne voit que ce qui est débloqué
// pour l'une de ses classes ; un visiteur ne voit rien.
//
// Fonctions pures (pas d'accès base) : le calcul des ensembles vit dans
// lib/auth/content-access.ts, ces helpers servent à filtrer partout.
export type ContentAccess =
  | { all: true }
  | {
      all: false;
      // Membre d'au moins une classe (qui peut ne suivre encore aucun cours).
      inAnyClass: boolean;
      // Cours des classes de l'étudiant, même si rien n'y est encore débloqué.
      coursIds: Set<string>;
      // Thématiques ayant au moins une ressource ou un quiz débloqué.
      thematiqueIds: Set<string>;
      ressourceIds: Set<string>;
      quizIds: Set<string>;
    };

export const noAccess: ContentAccess = {
  all: false,
  inAnyClass: false,
  coursIds: new Set(),
  thematiqueIds: new Set(),
  ressourceIds: new Set(),
  quizIds: new Set(),
};

export function canSeeCours(access: ContentAccess, id: string) {
  return access.all || access.coursIds.has(id);
}

// Les hadiths n'ont pas de déblocage propre : ils suivent leur thématique.
export function canSeeThematique(access: ContentAccess, id: string) {
  return access.all || access.thematiqueIds.has(id);
}

export function canSeeRessource(access: ContentAccess, id: string) {
  return access.all || access.ressourceIds.has(id);
}

export function canSeeQuiz(access: ContentAccess, id: string) {
  return access.all || access.quizIds.has(id);
}

// Une séance pointe vers du contenu existant : visible si elle en référence
// au moins un élément visible.
export function canSeeSeance(
  access: ContentAccess,
  seance: { thematiqueIds: string[]; ressourceIds: string[] }
) {
  return (
    access.all ||
    seance.thematiqueIds.some((id) => access.thematiqueIds.has(id)) ||
    seance.ressourceIds.some((id) => access.ressourceIds.has(id))
  );
}

// Filtre les ressources et quiz d'une thématique selon l'accès.
export function visibleItems<
  T extends { ressources: { id: string }[]; quiz: { id: string }[] },
>(access: ContentAccess, thematique: T): T {
  if (access.all) return thematique;
  return {
    ...thematique,
    ressources: thematique.ressources.filter((r) => access.ressourceIds.has(r.id)),
    quiz: thematique.quiz.filter((q) => access.quizIds.has(q.id)),
  };
}
