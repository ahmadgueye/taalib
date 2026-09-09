import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card";

export function HadithCard({
  slug,
  title,
  arabicText,
  translationFr,
  coursTitle,
  thematiqueTitle,
}: {
  slug: string;
  title: string;
  arabicText: string;
  translationFr: string;
  coursTitle: string;
  thematiqueTitle: string;
}) {
  return (
    <Link href={`/hadiths/${slug}`}>
      <Card className="h-full transition-colors hover:bg-muted">
        <CardHeader className="space-y-2">
          <Badge variant="outline" className="w-fit">
            {coursTitle}
          </Badge>
          {/* <CardTitle className="mt-1 font-heading">{title}</CardTitle> */}
          <p
            dir="rtl"
            lang="ar"
            className="line-clamp-2 font-arabic text-right text-sm text-muted-foreground"
          >
            {arabicText}
          </p>
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {translationFr}
          </p>
          <CardAction className="row-span-4 self-center">
            <ChevronRight className="size-4 text-muted-foreground" />
          </CardAction>
        </CardHeader>
      </Card>
    </Link>
  );
}
