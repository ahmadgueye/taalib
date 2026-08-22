"use client";

import { HadithCard } from "@/components/public/hadith-card";
import { RessourceItem } from "@/components/public/ressource-item";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type RessourceListItem = {
  id: string;
  title: string;
  type: "video" | "pdf" | "lien" | "texte";
  url: string | null;
  content: string | null;
  description: string | null;
};

type HadithListItem = {
  id: string;
  slug: string;
  title: string;
  arabicText: string;
  translationFr: string;
};

export function RessourcesHadithsTabs({
  ressources,
  hadiths,
  coursTitle,
  thematiqueTitle,
  completedIds,
}: {
  ressources: RessourceListItem[];
  hadiths: HadithListItem[];
  coursTitle: string;
  thematiqueTitle: string;
  completedIds?: Set<string>;
}) {
  return (
    <Tabs defaultValue="ressources" className="mt-8">
      <TabsList>
        <TabsTrigger value="ressources">
          Ressources ({ressources.length})
        </TabsTrigger>
        <TabsTrigger value="hadiths">Hadiths ({hadiths.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="ressources">
        {ressources.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Aucune ressource pour cette thématique pour le moment.
          </p>
        ) : (
          <div className="mt-4 grid gap-3">
            {ressources.map((r) => (
              <RessourceItem
                key={r.id}
                id={r.id}
                title={r.title}
                type={r.type}
                url={r.url}
                content={r.content}
                description={r.description}
                completed={completedIds?.has(r.id)}
              />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="hadiths">
        {hadiths.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Aucun hadith pour cette thématique pour le moment.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {hadiths.map((h) => (
              <HadithCard
                key={h.id}
                slug={h.slug}
                title={h.title}
                arabicText={h.arabicText}
                translationFr={h.translationFr}
                coursTitle={coursTitle}
                thematiqueTitle={thematiqueTitle}
              />
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
