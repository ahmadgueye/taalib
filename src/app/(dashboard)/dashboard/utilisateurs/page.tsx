import { notFound } from "next/navigation";

import { AccountsTable } from "@/components/dashboard/accounts-table";
import { RolesHelpDialog } from "@/components/dashboard/roles-help-dialog";
import { TeamSection } from "@/components/dashboard/team-section";
import { getCurrentProfile } from "@/lib/auth/get-session";
import { getAccounts, getTeam } from "@/lib/db/queries/users";

export default async function DashboardUtilisateursPage() {
  const currentProfile = await getCurrentProfile();
  if (currentProfile?.role !== "admin") {
    notFound();
  }

  const [team, accounts] = await Promise.all([getTeam(), getAccounts()]);

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Utilisateurs
      </h1>

      <section className="mt-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-heading text-lg font-semibold tracking-tight">
            Équipe ({team.length})
          </h2>
          <RolesHelpDialog />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Les personnes qui ont accès au dashboard. Pour en ajouter une, saisis
          l&apos;e-mail de son compte : elle doit s&apos;être connectée au moins
          une fois sur Taalib.
        </p>
        <div className="mt-4">
          <TeamSection members={team} currentUserId={currentProfile.id} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-heading text-lg font-semibold tracking-tight">
          Comptes ({accounts.length})
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Élèves et visiteurs du site, sans accès au dashboard.
        </p>
        <div className="mt-4">
          <AccountsTable data={accounts} />
        </div>
      </section>
    </div>
  );
}
