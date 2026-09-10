// Client-only: loads the King Fahd Quran Complex (QCF) mushaf font for a
// single page on demand, for either the plain v2 script (mushaf 1) or the
// colored Tajweed v4 script (mushaf 19). Each of the 604 mushaf pages has its
// own font file where every word is a hand-calibrated glyph, so lines
// reproduce the exact line breaks and edge-to-edge justification of the
// printed mushaf — text (even a monospaced Uthmani font) can never do this
// with CSS alone. In the tajweed variant the tajweed-rule colors are baked
// into the glyphs themselves (COLRv1 color font), so no per-letter HTML/CSS
// parsing is needed on our side.
// Fonts are pulled one page at a time via the FontFace API instead of
// declaring all 604 (times two variants) as static @font-face rules.

// NB: the repo also has a "mushaf-woff2/QCF_PNNN.woff2" set that looks
// page-specific by name but is actually a small shared ornament/symbol font
// (~600 glyphs, same across pages) — verified by rendering it and by cmap
// glyph counts. The real per-page word glyphs (~150-200 per page, matching
// the API's code_v2 field) only exist as TTF under mushaf-v2/QCF2NNN.ttf.
const QCF_V2_FONT_CDN = "https://cdn.jsdelivr.net/gh/nuqayah/qpc-fonts@master/mushaf-v2";

// Official Quran Foundation CDN for QCF Tajweed V4 (mushaf_id 19), COLRv1
// color-font format — supported natively by Chrome/Safari/Edge without any
// extra styling.
const QCF_V4_TAJWEED_FONT_CDN =
  "https://verses.quran.foundation/fonts/quran/hafs/v4/colrv1/woff2";

export type MushafId = 1 | 19;

// The tajweed font is a COLRv1 color font with 6 baked-in CPAL palettes.
// Palette 0 (the default, used when no font-palette is set) draws
// non-highlighted letters in solid black — invisible against a dark
// background. Palette 1 draws them in white instead, with the same tajweed
// rule colors, and is what we switch to in dark mode (see the
// `.dark [data-tajweed]` rule in globals.css using this custom ident).
export const TAJWEED_DARK_PALETTE = "--TajweedDark";
const TAJWEED_DARK_PALETTE_INDEX = 1;

const loadedPages = new Set<string>();
const registeredPalettes = new Set<string>();

export function qcfFontFamily(page: number, mushafId: MushafId = 1): string {
  const prefix = mushafId === 19 ? "QCF4" : "QCF2";
  return `${prefix}_${String(page).padStart(3, "0")}`;
}

function registerDarkPalette(family: string) {
  if (registeredPalettes.has(family)) return;
  registeredPalettes.add(family);

  let styleEl = document.getElementById(
    "tajweed-palettes",
  ) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "tajweed-palettes";
    document.head.appendChild(styleEl);
  }
  styleEl.append(
    `@font-palette-values ${TAJWEED_DARK_PALETTE} { font-family: "${family}"; base-palette: ${TAJWEED_DARK_PALETTE_INDEX}; }`,
  );
}

export async function loadQcfPageFont(
  page: number,
  mushafId: MushafId = 1,
): Promise<void> {
  if (typeof document === "undefined") return;

  const cacheKey = `${mushafId}:${page}`;
  if (loadedPages.has(cacheKey)) return;
  loadedPages.add(cacheKey);

  const family = qcfFontFamily(page, mushafId);
  const src =
    mushafId === 19
      ? `url(${QCF_V4_TAJWEED_FONT_CDN}/p${page}.woff2) format("woff2")`
      : `url(${QCF_V2_FONT_CDN}/QCF2${String(page).padStart(3, "0")}.ttf) format("truetype")`;

  try {
    const fontFace = new FontFace(family, src);
    document.fonts.add(fontFace);
    await fontFace.load();
    if (mushafId === 19) registerDarkPalette(family);
  } catch {
    loadedPages.delete(cacheKey);
  }
}
