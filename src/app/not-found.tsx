import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <Link
            href="/"
            lang="ar"
            className="flex items-center gap-2 font-logo-arabic text-2xl font-bold tracking-tight"
          >
            طالب
          </Link>
      {/* <h1 className="font-heading text-2xl font-semibold">Page introuvable</h1> */}
      <p className="max-w-sm text-muted-foreground">
        Cette page n&apos;existe pas ou a été déplacée.
      </p>
      <Button render={<Link href="/" />} nativeButton={false}>
        Retour à l&apos;accueil
      </Button>
    </div>
  );
}
