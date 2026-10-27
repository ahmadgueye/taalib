import { DetailHeaderSkeleton } from "@/components/public/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div>
      <DetailHeaderSkeleton />
      <div className="mt-8 flex flex-col gap-4">
        <Skeleton className="h-5 w-full" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border p-4">
            <Skeleton className="h-5 w-3/4" />
            <div className="mt-3 flex flex-col gap-2">
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
            </div>
          </div>
        ))}
        <Skeleton className="h-9 w-20" />
      </div>
    </div>
  );
}
