import type { Metadata } from "next";

import { QuranReader } from "@/components/public/quran-reader";
import { getCurrentProfile } from "@/lib/auth/get-session";
import { getMemorizationStatus } from "@/lib/db/queries/quran-memorization";
import { getChapters } from "@/lib/quran/queries";
import { getVersePageNumber } from "@/lib/quran/verse-page";

export const metadata: Metadata = {
  title: "Le Coran — Taalib",
  description: "Lire le Coran, sourate par sourate, verset par verset.",
};

type Props = {
  searchParams: Promise<{ sourate?: string; verset?: string }>;
};

export default async function CoranPage({ searchParams }: Props) {
  const params = await searchParams;
  const [chapters, profile] = await Promise.all([
    getChapters(),
    getCurrentProfile(),
  ]);
  const memorizationStatus = await getMemorizationStatus(profile?.id ?? null);

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

  const initialPage = getVersePageNumber(chapter.id, verseNumber);

  return (
    // -mt-12 annule le padding haut de <main> : la barre d'outils du lecteur
    // est collée sous l'en-tête dès le départ, comme une fois la page défilée.
    <div className="animate-in fade-in -mt-12 duration-300">
      <h1 className="sr-only">Le Coran</h1>
      <QuranReader
        chapters={chapters}
        initialPage={initialPage}
        initialChapterId={chapter.id}
        initialVerseNumber={verseNumber}
        initialMemorizationStatus={memorizationStatus}
        isAuthenticated={profile !== null}
        hasExplicitPosition={
          params.sourate !== undefined || params.verset !== undefined
        }
      />
    </div>
  );
}
