import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { NarratorsTable } from "@/components/dashboard/narrators-table";
import { getAllNarrators } from "@/lib/db/queries/narrators";

export default async function DashboardRapporteursPage() {
  const narratorsList = await getAllNarrators();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Rapporteurs
        </h1>
        <Button
          render={<Link href="/dashboard/rapporteurs/new" />}
          nativeButton={false}
        >
          <Plus className="size-4" />
          Nouveau rapporteur
        </Button>
      </div>

      <div className="mt-6">
        <NarratorsTable data={narratorsList} />
      </div>
    </div>
  );
}
