import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SearchCommand } from "@/components/public/search-command";
import { getCurrentProfile } from "@/lib/auth/get-session";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader profile={profile} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 pb-28 sm:pb-12">
        {children}
      </main>
      <SiteFooter />
      <SearchCommand />
      <MobileTabBar />
    </div>
  );
}
