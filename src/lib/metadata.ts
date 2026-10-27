// Next.js shallow-merges the `openGraph` object between layout and page
// metadata — a page that sets its own `openGraph` loses siteName/locale/type
// unless it spreads this in too.
export const siteOpenGraph = {
  siteName: "Taalib",
  locale: "fr_FR",
  type: "website" as const,
};

export const defaultDescription =
  "La plateforme de cours du programme Bayān.";

// Light strip of Markdown syntax for use in plain-text contexts (OG/meta
// descriptions) — doesn't need to be exhaustive, just avoid raw **/- noise.
export function stripMarkdown(input: string, maxLength = 160): string {
  const plain = input
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/[*_`#]/g, "")
    .replace(/^-\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();

  return plain.length > maxLength
    ? `${plain.slice(0, maxLength - 1)}…`
    : plain;
}
