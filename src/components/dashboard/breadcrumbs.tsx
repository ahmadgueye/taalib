import Link from "next/link";
import { ChevronRight } from "lucide-react";

// Fil d'Ariane des pages du dashboard. Le dernier élément est la page
// courante : il n'a pas de lien.
export function Breadcrumbs({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  return (
    <nav aria-label="Fil d'Ariane" className="mb-4 text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, i) => (
          <li key={`${i}-${item.label}`} className="flex min-w-0 items-center gap-1">
            {i > 0 && <ChevronRight className="size-3.5 shrink-0" aria-hidden />}
            {item.href ? (
              <Link href={item.href} className="truncate hover:text-foreground">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="truncate text-foreground">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

// Début du fil pour un élément rangé dans une thématique :
// Cours › {cours} › {thématique}.
export function thematiqueCrumbs(thematique: {
  id: string;
  title: string;
  cours: { id: string; title: string };
}) {
  return [
    { label: "Cours", href: "/dashboard/cours" },
    {
      label: thematique.cours.title,
      href: `/dashboard/cours/${thematique.cours.id}`,
    },
    { label: thematique.title, href: `/dashboard/thematiques/${thematique.id}` },
  ];
}
