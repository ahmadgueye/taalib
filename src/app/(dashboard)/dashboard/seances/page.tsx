import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SeancesTable } from "@/components/dashboard/seances-table";
import { getAllSeances } from "@/lib/db/queries/seances";

export const metadata: Metadata = { title: "Séances" };

export default async function DashboardSeancesPage() {
  const seancesList = await getAllSeances();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Séances de révision
        </h1>
        <Button render={<Link href="/dashboard/seances/new" />} nativeButton={false}>
          <Plus className="size-4" />
          Nouvelle séance
        </Button>
      </div>

      <div className="mt-6">
        <SeancesTable data={seancesList} />
      </div>
    </div>
  );
}
