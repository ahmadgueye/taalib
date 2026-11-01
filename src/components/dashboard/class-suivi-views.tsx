"use client";

import type { ReactNode } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Le suivi d'une classe, par étudiant (vue par défaut) ou par quiz.
export function ClassSuiviViews({
  byStudent,
  byQuiz,
}: {
  byStudent: ReactNode;
  byQuiz: ReactNode;
}) {
  return (
    <Tabs defaultValue="etudiants" className="gap-4">
      <TabsList>
        <TabsTrigger value="etudiants" className="px-3">
          Par étudiant
        </TabsTrigger>
        <TabsTrigger value="quiz" className="px-3">
          Par quiz
        </TabsTrigger>
      </TabsList>
      <TabsContent value="etudiants">{byStudent}</TabsContent>
      <TabsContent value="quiz">{byQuiz}</TabsContent>
    </Tabs>
  );
}
