import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { HadithsTable } from "@/components/dashboard/hadiths-table";
import { getAllHadiths } from "@/lib/db/queries/hadiths";
import { formatNarrators } from "@/lib/narrators";

export const metadata: Metadata = { title: "Hadiths" };

export default async function DashboardHadithsPage() {
  const hadithsList = await getAllHadiths();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Hadiths
        </h1>
        <Button
          render={<Link href="/dashboard/hadiths/new" />}
          nativeButton={false}
        >
          <Plus className="size-4" />
          Nouveau hadith
        </Button>
      </div>

      <div className="mt-6">
        <HadithsTable
          data={hadithsList.map((h) => ({
            ...h,
            narrator: formatNarrators(h.hadithNarrators),
          }))}
        />
      </div>
    </div>
  );
}
