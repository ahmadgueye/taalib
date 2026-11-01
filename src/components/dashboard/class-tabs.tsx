"use client";

import type { ReactNode } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type ClassTab = "suivi" | "cours" | "etudiants" | "reglages";

// L'onglet ouvert est reflété dans l'URL (?onglet=) sans recharger la page :
// un lien peut viser un onglet, et un rechargement le conserve.
export function ClassTabs({
  defaultTab,
  studentCount,
  suivi,
  cours,
  etudiants,
  reglages,
}: {
  defaultTab: ClassTab;
  studentCount: number;
  suivi: ReactNode;
  cours: ReactNode;
  etudiants: ReactNode;
  reglages: ReactNode;
}) {
  function handleChange(value: ClassTab) {
    const url = new URL(window.location.href);
    if (value === "suivi") url.searchParams.delete("onglet");
    else url.searchParams.set("onglet", value);
    window.history.replaceState(null, "", url);
  }

  return (
    <Tabs
      defaultValue={defaultTab}
      onValueChange={(value) => handleChange(value as ClassTab)}
      className="mt-6 gap-6"
    >
      <TabsList className="max-w-full overflow-x-auto">
        <TabsTrigger value="suivi" className="px-3">
          Suivi
        </TabsTrigger>
        <TabsTrigger value="cours" className="px-3">
          Cours
        </TabsTrigger>
        <TabsTrigger value="etudiants" className="px-3">
          Étudiants ({studentCount})
        </TabsTrigger>
        <TabsTrigger value="reglages" className="px-3">
          Réglages
        </TabsTrigger>
      </TabsList>
      <TabsContent value="suivi">{suivi}</TabsContent>
      <TabsContent value="cours">{cours}</TabsContent>
      <TabsContent value="etudiants">{etudiants}</TabsContent>
      <TabsContent value="reglages">{reglages}</TabsContent>
    </Tabs>
  );
}
