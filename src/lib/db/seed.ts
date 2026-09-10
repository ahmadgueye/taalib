import { db } from "./index";
import {
  cours,
  parcours,
  parcoursEtapes,
  ressources,
  seanceRessources,
  seanceThematiques,
  seances,
  thematiques,
} from "./schema";
import { slugify } from "@/lib/utils";

async function main() {
  console.log("Seeding...");

  const [aqida, fiqh, sira] = await db
    .insert(cours)
    .values([
      {
        slug: slugify("Aqida"),
        title: "Aqida",
        description: "Les fondements de la croyance islamique.",
      },
      {
        slug: slugify("Fiqh"),
        title: "Fiqh",
        description: "Jurisprudence et actes d'adoration au quotidien.",
      },
      {
        slug: slugify("Sīra"),
        title: "Sīra",
        description: "La biographie du Prophète ﷺ.",
      },
    ])
    .returning();

  const [tawhid, piliersFoi, priere, jeune, naissanceProphete] = await db
    .insert(thematiques)
    .values([
      {
        coursId: aqida.id,
        slug: slugify("Le Tawhid"),
        title: "Le Tawhid",
        description: "L'unicité d'Allah dans Ses noms, attributs et actes.",
        orderIndex: 0,
      },
      {
        coursId: aqida.id,
        slug: slugify("Les piliers de la foi"),
        title: "Les piliers de la foi",
        description: "Les six piliers de l'Iman.",
        orderIndex: 1,
      },
      {
        coursId: fiqh.id,
        slug: slugify("La prière"),
        title: "La prière",
        description: "Conditions, piliers et obligations de la salat.",
        orderIndex: 0,
      },
      {
        coursId: fiqh.id,
        slug: slugify("Le jeûne"),
        title: "Le jeûne",
        description: "Règles du jeûne du mois de Ramadan.",
        orderIndex: 1,
      },
      {
        coursId: sira.id,
        slug: slugify("La naissance du Prophète"),
        title: "La naissance du Prophète ﷺ",
        description: "Contexte et récit de la naissance du Prophète ﷺ.",
        orderIndex: 0,
      },
    ])
    .returning();

  const [tawhidVideo, tawhidPdf, priereVideo, priereLien] = await db
    .insert(ressources)
    .values([
      {
        thematiqueId: tawhid.id,
        title: "Introduction au Tawhid — cours audio",
        type: "video",
        url: "https://drive.google.com/example-tawhid-audio",
        description: "Enregistrement du cours du 12 janvier.",
      },
      {
        thematiqueId: tawhid.id,
        title: "Support de cours — Le Tawhid",
        type: "pdf",
        url: "https://drive.google.com/example-tawhid-pdf",
      },
      {
        thematiqueId: priere.id,
        title: "Les piliers de la prière — vidéo",
        type: "video",
        url: "https://youtube.com/example-priere",
      },
      {
        thematiqueId: priere.id,
        title: "Article : les conditions de validité de la prière",
        type: "lien",
        url: "https://example.com/conditions-priere",
      },
      {
        thematiqueId: jeune.id,
        title: "Fiche récapitulative — règles du jeûne",
        type: "pdf",
        url: "https://drive.google.com/example-jeune-pdf",
      },
    ])
    .returning();

  const [seanceRevision1, seanceRevision2] = await db
    .insert(seances)
    .values([
      {
        slug: slugify("Révision Aqida — Le Tawhid"),
        title: "Révision Aqida — Le Tawhid",
        sessionDate: "2026-08-02",
        summary:
          "Rappel des **catégories du Tawhid** et des points souvent confondus :\n\n- Tawhid al-Rububiyya\n- Tawhid al-Uluhiyya\n- Tawhid al-Asma wa-Sifat\n\nQuestions/réponses en fin de séance.",
      },
      {
        slug: slugify("Révision Fiqh — La prière"),
        title: "Révision Fiqh — La prière",
        sessionDate: "2026-08-09",
        summary:
          "Reprise des **piliers et obligations** de la prière, avec des cas pratiques. Voir aussi la [fiche récapitulative](https://drive.google.com/example-jeune-pdf) partagée en séance.",
      },
    ])
    .returning();

  await db.insert(seanceThematiques).values([
    { seanceId: seanceRevision1.id, thematiqueId: tawhid.id },
    { seanceId: seanceRevision1.id, thematiqueId: piliersFoi.id },
    { seanceId: seanceRevision2.id, thematiqueId: priere.id },
  ]);

  await db.insert(seanceRessources).values([
    { seanceId: seanceRevision1.id, ressourceId: tawhidVideo.id },
    { seanceId: seanceRevision1.id, ressourceId: tawhidPdf.id },
    { seanceId: seanceRevision2.id, ressourceId: priereVideo.id },
    { seanceId: seanceRevision2.id, ressourceId: priereLien.id },
  ]);

  const [parcoursFondamental] = await db
    .insert(parcours)
    .values({
      slug: slugify("Parcours fondamental"),
      title: "Parcours fondamental",
      description:
        "Une progression imposée à travers les fondamentaux : la croyance, puis la pratique, puis la biographie prophétique.",
    })
    .returning();

  await db.insert(parcoursEtapes).values([
    { parcoursId: parcoursFondamental.id, thematiqueId: tawhid.id, orderIndex: 0 },
    { parcoursId: parcoursFondamental.id, thematiqueId: priere.id, orderIndex: 1 },
    {
      parcoursId: parcoursFondamental.id,
      thematiqueId: naissanceProphete.id,
      orderIndex: 2,
    },
  ]);

  console.log("Seed ok:", {
    cours: [aqida.title, fiqh.title, sira.title],
    thematiques: 5,
    ressources: 5,
    seances: 2,
    parcours: parcoursFondamental.title,
  });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
