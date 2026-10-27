import {
  CardSkeleton,
  DetailHeaderSkeleton,
} from "@/components/public/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div>
      <DetailHeaderSkeleton />
      <Skeleton className="mt-3 h-5 w-full max-w-xl" />
      {/* Bloc de progression et bouton « Reprendre » */}
      <Skeleton className="mt-6 h-24 w-full sm:h-[74px]" />
      <Skeleton className="mt-10 h-7 w-36" />
      <div className="mt-4 grid gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
