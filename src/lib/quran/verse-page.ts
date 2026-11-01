import { PAGE_FIRST_VERSES } from "@/lib/quran/page-starts";

// Page du mushaf (1 à 604) où se trouve un verset, sans appel réseau : la
// dernière page qui commence avant ou sur ce verset. Utilisable côté client
// comme côté serveur.
export function getVersePageNumber(chapterId: number, verseNumber: number) {
  let low = 0;
  let high = PAGE_FIRST_VERSES.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    const [c, v] = PAGE_FIRST_VERSES[mid];
    if (c < chapterId || (c === chapterId && v <= verseNumber)) low = mid;
    else high = mid - 1;
  }
  return low + 1;
}
