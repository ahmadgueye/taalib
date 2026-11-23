import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SearchCommand } from "@/components/public/search-command";
import { getContentAccess } from "@/lib/auth/content-access";
import { getCurrentProfile } from "@/lib/auth/get-session";
import { getStudentQuizzes } from "@/lib/db/queries/student-quizzes";
import { countPendingQuizzes } from "@/lib/quiz-list";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();
  const pendingQuizzes = profile ? await pendingQuizCount(profile.id) : 0;

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader profile={profile} pendingQuizzes={pendingQuizzes} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 pb-28 sm:pb-12">
        {children}
      </main>
      <SiteFooter />
      {profile && <SearchCommand />}
      <MobileTabBar
        signedIn={Boolean(profile)}
        pendingQuizzes={pendingQuizzes}
      />
    </div>
  );
}

// Quiz à faire ou à retenter, pour la pastille du menu. Pas pour le staff :
// il voit tous les quiz sans en passer aucun.
async function pendingQuizCount(userId: string) {
  const access = await getContentAccess();
  if (access.all) return 0;
  return countPendingQuizzes(await getStudentQuizzes(userId, access));
}
