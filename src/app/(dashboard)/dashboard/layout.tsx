import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { FlashToaster } from "@/components/dashboard/flash-toaster";
import { getCurrentProfile } from "@/lib/auth/get-session";

// Titre d'onglet distinct du site (« Cours — Taalib ») : on sait d'un coup
// d'œil si l'onglet ouvert est le dashboard ou l'aperçu.
export const metadata: Metadata = {
  title: { default: "Dashboard · Taalib", template: "%s · Dashboard" },
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role === "viewer") {
    redirect("/?welcome=1");
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col md:flex-row">
      <DashboardSidebar isAdmin={profile.role === "admin"} />
      <FlashToaster />
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  );
}
