import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="hidden border-t sm:block">
      <div className="mx-auto w-full max-w-5xl px-6 py-6 text-sm text-muted-foreground">
        <Link
          href="/"
          lang="ar"
          className=" font-logo-arabic text-xl font-bold tracking-tight"
        >
          {/* <BookOpen className="size-5" /> */}
          طالب
        </Link>{" "}
        — la plateforme de cours du programme{" "}
        <a
          href="https://bayanun.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4 hover:text-foreground"
        >
          Bayān
        </a>
        .
      </div>
    </footer>
  );
}
