import { relations, sql } from "drizzle-orm";
import {
  date,
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
