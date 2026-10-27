"use client";

import { HadithCard } from "@/components/public/hadith-card";
import { QuizItem } from "@/components/public/quiz-item";
import { RessourceItem } from "@/components/public/ressource-item";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { QuizScore } from "@/lib/db/queries/quiz-tentatives";

type RessourceListItem = {
  id: string;
  title: string;
  type: "video" | "pdf" | "lien" | "texte";
  url: string | null;
  description: string | null;
  locked?: boolean;
};

type HadithListItem = {
  id: string;
  slug: string;
  title: string;
  arabicText: string;
  translationFr: string;
};

type QuizListItem = {
  id: string;
  title: string;
  description: string | null;
  passingScore: number;
  questions: unknown[];
  locked?: boolean;
};

export function RessourcesHadithsTabs({
  ressources,
  hadiths,
  quiz,
  coursTitle,
  completedIds,
  quizScores,
}: {
  ressources: RessourceListItem[];
  hadiths: HadithListItem[];
  quiz?: QuizListItem[];
  coursTitle: string;
  completedIds?: Set<string>;
  quizScores?: Map<string, QuizScore>;
}) {
  return (
    <Tabs defaultValue="ressources" className="mt-8">
      <TabsList>
        <TabsTrigger value="ressources">
          Ressources ({ressources.length})
        </TabsTrigger>
        <TabsTrigger value="hadiths">Hadiths ({hadiths.length})</TabsTrigger>
        {quiz && <TabsTrigger value="quiz">Quiz ({quiz.length})</TabsTrigger>}
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
                description={r.description}
                completed={completedIds?.has(r.id)}
                locked={r.locked}
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
                arabicText={h.arabicText}
                translationFr={h.translationFr}
                coursTitle={coursTitle}
              />
            ))}
          </div>
        )}
      </TabsContent>

      {quiz && (
        <TabsContent value="quiz">
          {quiz.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Aucun quiz pour cette thématique pour le moment.
            </p>
          ) : (
            <div className="mt-4 grid gap-3">
              {quiz.map((q) => (
                <QuizItem
                  key={q.id}
                  id={q.id}
                  title={q.title}
                  description={q.description}
                  questionCount={q.questions.length}
                  passingScore={q.passingScore}
                  score={quizScores?.get(q.id)}
                  locked={q.locked}
                />
              ))}
            </div>
          )}
        </TabsContent>
      )}
    </Tabs>
  );
}
