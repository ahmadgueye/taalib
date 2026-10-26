import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Mêmes dimensions que EntityCard : la page ne « saute » pas quand le vrai
// contenu arrive.
export function CardSkeleton() {
  return (
    <Card>
      <CardHeader className="gap-2">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </CardHeader>
    </Card>
  );
}

// Retour + fil d'Ariane + titre, communs aux pages de détail.
export function DetailHeaderSkeleton() {
  return (
    <>
      <Skeleton className="h-5 w-16" />
      <Skeleton className="mt-3 h-4 w-48 max-w-full" />
      <Skeleton className="mt-3 h-9 w-72 max-w-full" />
    </>
  );
}
