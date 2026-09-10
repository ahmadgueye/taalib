const fileExtensions = [".mp4", ".webm", ".mov", ".ogg", ".m4v"];

export type VideoEmbedSource =
  | { kind: "youtube"; embedUrl: string }
  | { kind: "vimeo"; embedUrl: string }
  | { kind: "file" }
  | { kind: "unknown" };

export function getVideoEmbedSource(url: string): VideoEmbedSource {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { kind: "unknown" };
  }

  const host = parsed.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    const id = parsed.pathname.slice(1);
    if (id) return { kind: "youtube", embedUrl: `https://www.youtube.com/embed/${id}` };
  }

  if (host === "youtube.com" || host === "m.youtube.com") {
    if (parsed.pathname === "/watch") {
      const id = parsed.searchParams.get("v");
      if (id) return { kind: "youtube", embedUrl: `https://www.youtube.com/embed/${id}` };
    }
    const embedMatch = parsed.pathname.match(/^\/(embed|shorts)\/([\w-]+)/);
    if (embedMatch) {
      return { kind: "youtube", embedUrl: `https://www.youtube.com/embed/${embedMatch[2]}` };
    }
  }

  if (host === "vimeo.com") {
    const match = parsed.pathname.match(/^\/(\d+)/);
    if (match) return { kind: "vimeo", embedUrl: `https://player.vimeo.com/video/${match[1]}` };
  }

  const pathname = parsed.pathname.toLowerCase();
  if (fileExtensions.some((ext) => pathname.endsWith(ext))) {
    return { kind: "file" };
  }

  return { kind: "unknown" };
}
