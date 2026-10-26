import { db } from "./index";
import {
  classCours,
  classRessourceUnlocks,
  classes,
  cours,
  ressources,
  seanceRessources,
  seanceThematiques,
  seances,
  thematiques,
} from "./schema";
import { generateInviteCode } from "@/lib/class-invite";
import { slugify } from "@/lib/utils";

// Garde-fou : ce script écrit des données de démo. Il refuse de tourner contre
// une base distante (la prod) sauf confirmation explicite.
const dbUrl = process.env.DATABASE_URL ?? "";
const isLocalDb = /@(127\.0\.0\.1|localhost|\[::1\]):/.test(dbUrl);
if (!isLocalDb && process.env.ALLOW_REMOTE_DB !== "1") {
  console.error(
    "Refus de seeder une base non locale. Utilise `npm run db:seed:local`, " +
      "ou ALLOW_REMOTE_DB=1 si tu sais ce que tu fais."
  );
  process.exit(1);
}

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

  const [tawhid, piliersFoi, priere, jeune] = await db
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

  // Une classe de démo : la croyance puis la pratique, avec la première
  // ressource déjà débloquée. Un compte qui la rejoint (code affiché
  // ci-dessous) voit sa feuille de route sur l'accueil.
  const [classeDemo] = await db
    .insert(classes)
    .values({
      name: "Classe de démo",
      description: "Les fondamentaux : la croyance, puis la pratique.",
      inviteCode: generateInviteCode(),
    })
    .returning();

  await db.insert(classCours).values([
    { classId: classeDemo.id, coursId: aqida.id, orderIndex: 0 },
    { classId: classeDemo.id, coursId: fiqh.id, orderIndex: 1 },
  ]);

  await db
    .insert(classRessourceUnlocks)
    .values({ classId: classeDemo.id, ressourceId: tawhidVideo.id });

  console.log("Seed ok:", {
    cours: [aqida.title, fiqh.title, sira.title],
    thematiques: 5,
    ressources: 5,
    seances: 2,
    classe: `${classeDemo.name} (code ${classeDemo.inviteCode})`,
  });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
