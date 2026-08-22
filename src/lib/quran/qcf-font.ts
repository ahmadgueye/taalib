// Client-only: loads the King Fahd Quran Complex (QCF v2) mushaf font for a
// single page on demand. Each of the 604 mushaf pages has its own font file
// where every word is a hand-calibrated glyph, so lines reproduce the exact
// line breaks and edge-to-edge justification of the printed mushaf — text
// (even a monospaced Uthmani font) can never do this with CSS alone.
// Fonts are pulled one page at a time via the FontFace API instead of
// declaring all 604 as static @font-face rules.

// NB: the repo also has a "mushaf-woff2/QCF_PNNN.woff2" set that looks
// page-specific by name but is actually a small shared ornament/symbol font
// (~600 glyphs, same across pages) — verified by rendering it and by cmap
// glyph counts. The real per-page word glyphs (~150-200 per page, matching
// the API's code_v2 field) only exist as TTF under mushaf-v2/QCF2NNN.ttf.
const QCF_FONT_CDN = "https://cdn.jsdelivr.net/gh/nuqayah/qpc-fonts@master/mushaf-v2";

const loadedPages = new Set<number>();

export function qcfFontFamily(page: number): string {
  return `QCF2_${String(page).padStart(3, "0")}`;
}

export async function loadQcfPageFont(page: number): Promise<void> {
  if (typeof document === "undefined") return;
  if (loadedPages.has(page)) return;
  loadedPages.add(page);

  const family = qcfFontFamily(page);
  const fileName = `QCF2${String(page).padStart(3, "0")}.ttf`;

  try {
    const fontFace = new FontFace(
      family,
      `url(${QCF_FONT_CDN}/${fileName}) format("truetype")`
    );
    document.fonts.add(fontFace);
    await fontFace.load();
  } catch {
    loadedPages.delete(page);
  }
}
