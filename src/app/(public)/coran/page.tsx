import type { Metadata } from "next";

import { QuranReader } from "@/components/public/quran-reader";
import { getChapters, getVersePage } from "@/lib/quran/queries";

export const metadata: Metadata = {
  title: "Le Coran — Taalib",
  description: "Lire le Coran, sourate par sourate, verset par verset.",
};

type Props = {
  searchParams: Promise<{ sourate?: string; verset?: string }>;
};

export default async function CoranPage({ searchParams }: Props) {
  const params = await searchParams;
  const chapters = await getChapters();

  const requestedChapterId = Number(params.sourate);
  const chapter =
    chapters.find((c) => c.id === requestedChapterId) ?? chapters[0];

  const requestedVerseNumber = Number(params.verset);
  const verseNumber =
    Number.isInteger(requestedVerseNumber) &&
    requestedVerseNumber >= 1 &&
    requestedVerseNumber <= chapter.versesCount
      ? requestedVerseNumber
      : 1;

  const initialPage =
    verseNumber > 1
      ? await getVersePage(chapter.id, verseNumber)
      : chapter.firstPage;

  return (
    <div className="animate-in fade-in -mt-4 duration-300 sm:-mt-6">
      <h1 className="sr-only">Le Coran</h1>
      <QuranReader
        chapters={chapters}
        initialPage={initialPage}
        initialChapterId={chapter.id}
        initialVerseNumber={verseNumber}
      />
    </div>
  );
}
