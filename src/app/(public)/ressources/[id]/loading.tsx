import { DetailHeaderSkeleton } from "@/components/public/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div>
      <DetailHeaderSkeleton />
      {/* Lecteur (vidéo, PDF ou texte) */}
      <Skeleton className="mt-6 aspect-video w-full" />
      <div className="mt-6 flex flex-col gap-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}
