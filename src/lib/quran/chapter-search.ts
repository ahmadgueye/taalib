import type { QuranChapter } from "@/lib/quran/types";

// Minuscules, sans accents ni tashkeel, sans espaces ni tirets : « Al
// Baqara », « al-baqarah » et « البقرة » trouvent tous Al-Baqarah.
function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ًͯ-ٰٟ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

// Sourates correspondant à la recherche du sélecteur du lecteur : par
// numéro (préfixe : « 11 » donne 11, 110 à 114) ou par nom translittéré,
// traduit ou arabe. Une recherche vide renvoie toutes les sourates.
export function filterChapters(chapters: QuranChapter[], query: string) {
  const q = normalize(query);
  if (!q) return chapters;
  if (/^\d+$/.test(q)) {
    return chapters.filter((c) => String(c.id).startsWith(q));
  }
  return chapters.filter((c) =>
    [c.nameSimple, c.nameTranslated, c.nameArabic].some((name) =>
      normalize(name).includes(q)
    )
  );
}
