import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { getCurrentProfile } from "@/lib/auth/get-session";

export const metadata: Metadata = {
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
    <div className="flex min-w-0 flex-1">
      <DashboardSidebar isAdmin={profile.role === "admin"} />
      <main className="min-w-0 flex-1 px-8 py-8">{children}</main>
    </div>
  );
}
