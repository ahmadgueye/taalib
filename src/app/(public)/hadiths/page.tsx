import type { Metadata } from "next";

import { HadithCard } from "@/components/public/hadith-card";
import { getAllHadiths } from "@/lib/db/queries/hadiths";

export const metadata: Metadata = {
  title: "Hadiths — Taalib",
};

export default async function HadithsListPage() {
  const hadithsList = await getAllHadiths();

  return (
    <div className="animate-in fade-in duration-300">
      <h1 className="font-heading text-3xl font-semibold tracking-tight">
        Hadiths
      </h1>
      <p className="mt-2 text-muted-foreground">
        Textes et traductions rattachés aux thématiques des cours.
      </p>

      {hadithsList.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">
          Aucun hadith pour le moment.
        </p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-1">
          {hadithsList.map((h) => (
            <HadithCard
              key={h.id}
              slug={h.slug}
              title={h.title}
              arabicText={h.arabicText}
              translationFr={h.translationFr}
              coursTitle={h.thematique.cours.title}
              thematiqueTitle={h.thematique.title}
            />
          ))}
        </div>
      )}
    </div>
  );
}
