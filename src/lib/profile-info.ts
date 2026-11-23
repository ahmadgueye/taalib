import { z } from "zod";

import { splitPhone, toE164 } from "@/lib/phone";

// Informations demandées à l'inscription. Toutes sont obligatoires pour un
// étudiant ; le staff n'a besoin que de son nom.
export type ProfileInfo = {
  role: "admin" | "contributor" | "viewer";
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  address: string | null;
  birthDate: string | null;
};

export function isProfileComplete(profile: ProfileInfo) {
  if (profile.role !== "viewer") return Boolean(profile.fullName?.trim());
  return Boolean(
    profile.firstName?.trim() &&
    profile.lastName?.trim() &&
    profile.phone?.trim() &&
    profile.address?.trim() &&
    profile.birthDate,
  );
}

// Valeurs proposées dans le formulaire : un étudiant inscrit avant l'ajout
// du prénom et du nom retrouve son nom complet découpé (premier mot = prénom).
export function profileFormDefaults(profile: ProfileInfo) {
  const [first = "", ...rest] = (profile.fullName ?? "").trim().split(/\s+/);
  const phone = splitPhone(profile.phone);
  return {
    firstName: profile.firstName ?? first,
    lastName: profile.lastName ?? rest.join(" "),
    phoneCountry: phone.country,
    phone: phone.national,
    address: profile.address ?? "",
    birthDate: profile.birthDate ?? "",
  };
}

const required = (message: string) => z.string().trim().min(1, message);

// Le formulaire envoie toujours tous les champs ; ceux du staff peuvent
// rester vides (`staff`), ceux d'un étudiant non. Le téléphone est validé
// pour le pays choisi (`phoneCountry`) et ressort au format E.164.
export function profileInfoSchema({ staff }: { staff: boolean }) {
  const optional = (schema: z.ZodType<string>) =>
    staff ? z.union([z.literal(""), schema]) : schema;

  return z
    .object({
      firstName: required("Le prénom est requis.").max(100),
      lastName: required("Le nom est requis.").max(100),
      phoneCountry: z.string(),
      phone: optional(required("Le téléphone est requis.").max(30)),
      address: optional(required("L'adresse est requise.").max(300)),
      birthDate: optional(
        z
          .string()
          .min(1, "La date de naissance est requise.")
          .refine(isPlausibleBirthDate, "Date de naissance invalide."),
      ),
    })
    .transform((values, ctx) => {
      if (!values.phone) return values;
      const phone = toE164(values.phoneCountry, values.phone);
      if (!phone) {
        ctx.addIssue({
          code: "custom",
          path: ["phone"],
          message: "Ce numéro de téléphone n'est pas valide pour ce pays.",
        });
        return z.NEVER;
      }
      return { ...values, phone };
    });
}

function isPlausibleBirthDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return false;
  return date.getUTCFullYear() >= 1900 && date.getTime() <= Date.now();
}
