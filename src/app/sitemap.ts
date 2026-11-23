import type { MetadataRoute } from "next";

// Le catalogue (cours, thématiques, hadiths...) est réservé aux étudiants et
// l'accueil renvoie un visiteur sur /login : seul le Qur'an, ouvert à tous,
// est proposé à l'indexation.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return ["/coran"].map((path) => ({ url: `${base}${path}` }));
}
