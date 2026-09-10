import { ExternalLinkCard } from "@/components/public/external-link-card";
import { getVideoEmbedSource } from "@/lib/video-embed";

export function VideoEmbed({ url }: { url: string }) {
  const source = getVideoEmbedSource(url);

  if (source.kind === "youtube" || source.kind === "vimeo") {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-lg border bg-black">
        <iframe
          src={source.embedUrl}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (source.kind === "file") {
    return <video src={url} controls className="w-full rounded-lg border" />;
  }

  return <ExternalLinkCard url={url} label="Regarder la vidéo" />;
}
