"use client";

import type { ReactNode } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type AccountTab = "progression" | "parametres";

// L'onglet ouvert est reflété dans l'URL (?onglet=) sans recharger la page :
// un lien peut viser un onglet, et un rechargement le conserve.
export function AccountTabs({
  defaultTab,
  progression,
  parametres,
}: {
  defaultTab: AccountTab;
  progression: ReactNode;
  parametres: ReactNode;
}) {
  function handleChange(value: AccountTab) {
    const url = new URL(window.location.href);
    if (value === "progression") url.searchParams.delete("onglet");
    else url.searchParams.set("onglet", value);
    window.history.replaceState(null, "", url);
  }

  return (
    <Tabs
      defaultValue={defaultTab}
      onValueChange={(value) => handleChange(value as AccountTab)}
      className="mt-6 gap-6"
    >
      <TabsList>
        <TabsTrigger value="progression" className="px-3">
          Progression
        </TabsTrigger>
        <TabsTrigger value="parametres" className="px-3">
          Paramètres
        </TabsTrigger>
      </TabsList>
      <TabsContent value="progression">{progression}</TabsContent>
      <TabsContent value="parametres">{parametres}</TabsContent>
    </Tabs>
  );
}
