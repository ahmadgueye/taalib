import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ExternalLinkCard({
  url,
  label,
}: {
  url: string;
  label: string;
}) {
  const domain = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return null;
    }
  })();

  return (
    <div className="flex flex-col items-start gap-4 rounded-lg border p-6">
      {domain && <p className="text-xs text-muted-foreground">{domain}</p>}
      <Button
        render={
          <a href={url} target="_blank" rel="noopener noreferrer" />
        }
      >
        {label}
        <ExternalLink />
      </Button>
    </div>
  );
}
