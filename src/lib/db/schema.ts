import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["admin", "contributor", "viewer"]);
export const ressourceTypeEnum = pgEnum("ressource_type", [
  "video",
  "pdf",
  "lien",
  "texte",
]);
export const ressourceStatusEnum = pgEnum("ressource_status", [
  "draft",
  "published",
]);
export const coursStatusEnum = pgEnum("cours_status", [
  "published",
  "coming_soon",
]);
export const questionTypeEnum = pgEnum("question_type", [
  "qcm",
  "vrai_faux",
]);
export const memorizationStatusEnum = pgEnum("memorization_status", [
  "en_cours",
  "a_renforcer",
  "maitrise",
]);
export type MemorizationStatus =
  (typeof memorizationStatusEnum.enumValues)[number];

// Mirrors auth.users (Supabase-managed). One row per authenticated user.
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  fullName: text("full_name"),
  role: roleEnum("role").notNull().default("viewer"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const cours = pgTable("cours", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  // Nom du cours en arabe (ex. « العقيدة »), affiché en calligraphie ruq'a
  // sur la carte du cours. Facultatif.
  arabicTitle: text("arabic_title"),
  description: text("description"),
  status: coursStatusEnum("status").notNull().default("published"),
  createdBy: uuid("created_by").references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const thematiques = pgTable("thematiques", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  coursId: uuid("cours_id")
    .notNull()
    .references(() => cours.id, { onDelete: "cascade" }),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  orderIndex: integer("order_index").notNull().default(0),
  createdBy: uuid("created_by").references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const ressources = pgTable("ressources", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  thematiqueId: uuid("thematique_id")
    .notNull()
    .references(() => thematiques.id, { onDelete: "cascade" }),
  orderIndex: integer("order_index").notNull().default(0),
  title: text("title").notNull(),
  type: ressourceTypeEnum("type").notNull(),
  url: text("url"),
  content: text("content"),
  description: text("description"),
  status: ressourceStatusEnum("status").notNull().default("published"),
  addedBy: uuid("added_by").references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const ressourceProgress = pgTable(
  "ressource_progress",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    ressourceId: uuid("ressource_id")
      .notNull()
      .references(() => ressources.id, { onDelete: "cascade" }),
    completedAt: timestamp("completed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.ressourceId] })]
);

export const quiz = pgTable("quiz", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  thematiqueId: uuid("thematique_id")
    .notNull()
    .references(() => thematiques.id, { onDelete: "cascade" }),
  orderIndex: integer("order_index").notNull().default(0),
  title: text("title").notNull(),
  description: text("description"),
  status: ressourceStatusEnum("status").notNull().default("published"),
  passingScore: integer("passing_score").notNull().default(80),
  addedBy: uuid("added_by").references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const quizQuestions = pgTable("quiz_questions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  quizId: uuid("quiz_id")
    .notNull()
    .references(() => quiz.id, { onDelete: "cascade" }),
  orderIndex: integer("order_index").notNull().default(0),
  prompt: text("prompt").notNull(),
  type: questionTypeEnum("type").notNull(),
  explanation: text("explanation"),
});

export const quizChoix = pgTable("quiz_choix", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  questionId: uuid("question_id")
    .notNull()
    .references(() => quizQuestions.id, { onDelete: "cascade" }),
  orderIndex: integer("order_index").notNull().default(0),
  label: text("label").notNull(),
  isCorrect: boolean("is_correct").notNull().default(false),
});

export const quizTentatives = pgTable("quiz_tentatives", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  quizId: uuid("quiz_id")
    .notNull()
    .references(() => quiz.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  score: integer("score").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const quizReponses = pgTable(
  "quiz_reponses",
  {
    tentativeId: uuid("tentative_id")
      .notNull()
      .references(() => quizTentatives.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => quizQuestions.id, { onDelete: "cascade" }),
    choixId: uuid("choix_id")
      .notNull()
      .references(() => quizChoix.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.tentativeId, table.choixId] })]
);

export const hadiths = pgTable("hadiths", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  thematiqueId: uuid("thematique_id")
    .notNull()
    .references(() => thematiques.id, { onDelete: "cascade" }),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  arabicText: text("arabic_text").notNull(),
  translationFr: text("translation_fr").notNull(),
  translationWolof: text("translation_wolof"),
  narrator: text("narrator").notNull(),
  source: text("source"),
  addedBy: uuid("added_by").references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const seances = pgTable("seances", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  sessionDate: date("session_date"),
  summary: text("summary"),
  createdBy: uuid("created_by").references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const seanceThematiques = pgTable(
  "seance_thematiques",
  {
    seanceId: uuid("seance_id")
      .notNull()
      .references(() => seances.id, { onDelete: "cascade" }),
    thematiqueId: uuid("thematique_id")
      .notNull()
      .references(() => thematiques.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.seanceId, table.thematiqueId] })]
);

export const seanceRessources = pgTable(
  "seance_ressources",
  {
    seanceId: uuid("seance_id")
      .notNull()
      .references(() => seances.id, { onDelete: "cascade" }),
    ressourceId: uuid("ressource_id")
      .notNull()
      .references(() => ressources.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.seanceId, table.ressourceId] })]
);

export const quranMemorization = pgTable(
  "quran_memorization",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    chapterId: integer("chapter_id").notNull(),
    verseNumber: integer("verse_number").notNull(),
    // Dénormalisé ("2:255") pour un lookup direct côté client sans
    // reconstruire la clé à partir de chapterId+verseNumber.
    verseKey: text("verse_key").notNull(),
    status: memorizationStatusEnum("status").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.verseKey] }),
    index("quran_memorization_user_chapter_idx").on(
      table.userId,
      table.chapterId
    ),
  ]
);

// Une classe du programme : un groupe d'étudiants. Le contenu reste dans le
// catalogue (cours/thématiques) ; la classe ne fait que regrouper des membres.
export const classes = pgTable("classes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  // Code à partager pour rejoindre la classe via /rejoindre/[code]. Unique,
  // régénérable (l'ancien code cesse alors de fonctionner).
  inviteCode: text("invite_code").notNull().unique(),
  inviteEnabled: boolean("invite_enabled").notNull().default(true),
  createdBy: uuid("created_by").references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const classMembers = pgTable(
  "class_members",
  {
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Renseignée quand l'étudiant a terminé la classe (ancien élève) : il
    // garde ce qui était débloqué avant cette date, rien de ce qui suit.
    leftAt: timestamp("left_at", { withTimezone: true }),
  },
  (table) => [
    primaryKey({ columns: [table.classId, table.userId] }),
    index("class_members_user_idx").on(table.userId),
  ]
);

// Cours suivis par une classe. Un même cours peut être dans plusieurs
// classes, chacune avec son propre rythme de déblocage (class_*_unlocks).
export const classCours = pgTable(
  "class_cours",
  {
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    coursId: uuid("cours_id")
      .notNull()
      .references(() => cours.id, { onDelete: "cascade" }),
    // Ordre des cours dans la feuille de route de la classe.
    orderIndex: integer("order_index").notNull().default(0),
    addedAt: timestamp("added_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.classId, table.coursId] })]
);

// Ressources et quiz ouverts à une classe, un par un au fil des semaines.
// Pas de ligne = verrouillé. Une thématique devient visible pour la classe dès
// qu'un de ses éléments est débloqué (ses hadiths la suivent).
export const classRessourceUnlocks = pgTable(
  "class_ressource_unlocks",
  {
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    ressourceId: uuid("ressource_id")
      .notNull()
      .references(() => ressources.id, { onDelete: "cascade" }),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.classId, table.ressourceId] })]
);

export const classQuizUnlocks = pgTable(
  "class_quiz_unlocks",
  {
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    quizId: uuid("quiz_id")
      .notNull()
      .references(() => quiz.id, { onDelete: "cascade" }),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.classId, table.quizId] })]
);

export const coursRelations = relations(cours, ({ many }) => ({
  thematiques: many(thematiques),
}));

export const thematiquesRelations = relations(
  thematiques,
  ({ one, many }) => ({
    cours: one(cours, {
      fields: [thematiques.coursId],
      references: [cours.id],
    }),
    ressources: many(ressources),
    hadiths: many(hadiths),
    quiz: many(quiz),
    seanceThematiques: many(seanceThematiques),
  })
);

export const ressourcesRelations = relations(ressources, ({ one, many }) => ({
  thematique: one(thematiques, {
    fields: [ressources.thematiqueId],
    references: [thematiques.id],
  }),
  seanceRessources: many(seanceRessources),
  ressourceProgress: many(ressourceProgress),
}));

export const ressourceProgressRelations = relations(
  ressourceProgress,
  ({ one }) => ({
    user: one(profiles, {
      fields: [ressourceProgress.userId],
      references: [profiles.id],
    }),
    ressource: one(ressources, {
      fields: [ressourceProgress.ressourceId],
      references: [ressources.id],
    }),
  })
);

export const hadithsRelations = relations(hadiths, ({ one }) => ({
  thematique: one(thematiques, {
    fields: [hadiths.thematiqueId],
    references: [thematiques.id],
  }),
}));

export const quizRelations = relations(quiz, ({ one, many }) => ({
  thematique: one(thematiques, {
    fields: [quiz.thematiqueId],
    references: [thematiques.id],
  }),
  questions: many(quizQuestions),
  tentatives: many(quizTentatives),
}));

export const quizQuestionsRelations = relations(
  quizQuestions,
  ({ one, many }) => ({
    quiz: one(quiz, {
      fields: [quizQuestions.quizId],
      references: [quiz.id],
    }),
    choix: many(quizChoix),
  })
);

export const quizChoixRelations = relations(quizChoix, ({ one }) => ({
  question: one(quizQuestions, {
    fields: [quizChoix.questionId],
    references: [quizQuestions.id],
  }),
}));

export const quizTentativesRelations = relations(
  quizTentatives,
  ({ one, many }) => ({
    quiz: one(quiz, {
      fields: [quizTentatives.quizId],
      references: [quiz.id],
    }),
    user: one(profiles, {
      fields: [quizTentatives.userId],
      references: [profiles.id],
    }),
    reponses: many(quizReponses),
  })
);

export const quizReponsesRelations = relations(quizReponses, ({ one }) => ({
  tentative: one(quizTentatives, {
    fields: [quizReponses.tentativeId],
    references: [quizTentatives.id],
  }),
  question: one(quizQuestions, {
    fields: [quizReponses.questionId],
    references: [quizQuestions.id],
  }),
  choix: one(quizChoix, {
    fields: [quizReponses.choixId],
    references: [quizChoix.id],
  }),
}));

export const seancesRelations = relations(seances, ({ many }) => ({
  seanceThematiques: many(seanceThematiques),
  seanceRessources: many(seanceRessources),
}));

export const seanceThematiquesRelations = relations(
  seanceThematiques,
  ({ one }) => ({
    seance: one(seances, {
      fields: [seanceThematiques.seanceId],
      references: [seances.id],
    }),
    thematique: one(thematiques, {
      fields: [seanceThematiques.thematiqueId],
      references: [thematiques.id],
    }),
  })
);

export const seanceRessourcesRelations = relations(
  seanceRessources,
  ({ one }) => ({
    seance: one(seances, {
      fields: [seanceRessources.seanceId],
      references: [seances.id],
    }),
    ressource: one(ressources, {
      fields: [seanceRessources.ressourceId],
      references: [ressources.id],
    }),
  })
);

export const quranMemorizationRelations = relations(
  quranMemorization,
  ({ one }) => ({
    user: one(profiles, {
      fields: [quranMemorization.userId],
      references: [profiles.id],
    }),
  })
);

export const classesRelations = relations(classes, ({ many }) => ({
  members: many(classMembers),
  cours: many(classCours),
  ressourceUnlocks: many(classRessourceUnlocks),
  quizUnlocks: many(classQuizUnlocks),
}));

export const classMembersRelations = relations(classMembers, ({ one }) => ({
  class: one(classes, {
    fields: [classMembers.classId],
    references: [classes.id],
  }),
  user: one(profiles, {
    fields: [classMembers.userId],
    references: [profiles.id],
  }),
}));

export const classCoursRelations = relations(classCours, ({ one }) => ({
  class: one(classes, {
    fields: [classCours.classId],
    references: [classes.id],
  }),
  cours: one(cours, {
    fields: [classCours.coursId],
    references: [cours.id],
  }),
}));

export const classRessourceUnlocksRelations = relations(
  classRessourceUnlocks,
  ({ one }) => ({
    class: one(classes, {
      fields: [classRessourceUnlocks.classId],
      references: [classes.id],
    }),
    ressource: one(ressources, {
      fields: [classRessourceUnlocks.ressourceId],
      references: [ressources.id],
    }),
  })
);

export const classQuizUnlocksRelations = relations(
  classQuizUnlocks,
  ({ one }) => ({
    class: one(classes, {
      fields: [classQuizUnlocks.classId],
      references: [classes.id],
    }),
    quiz: one(quiz, {
      fields: [classQuizUnlocks.quizId],
      references: [quiz.id],
    }),
  })
);
