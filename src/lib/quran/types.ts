export type QuranChapter = {
  id: number;
  nameSimple: string;
  nameArabic: string;
  nameTranslated: string;
  versesCount: number;
  firstPage: number;
  lastPage: number;
  hasBismillah: boolean;
};

export type QuranWord = {
  text: string;
  lineNumber: number;
  isEnd: boolean;
  /** QCF v2 glyph (private-use-area character) for this word, one mushaf font per page. */
  glyph: string;
  /** Mushaf page number of the QCF v2 font that draws `glyph` correctly. */
  glyphPage: number;
};

export type QuranVerse = {
  chapterId: number;
  verseNumber: number;
  verseKey: string;
  words: QuranWord[];
  pageNumber: number;
  translation: string | null;
};

export type QuranPage = {
  pageNumber: number;
  verses: QuranVerse[];
};

export type QuranReciter = {
  id: number;
  name: string;
  style: string | null;
};
