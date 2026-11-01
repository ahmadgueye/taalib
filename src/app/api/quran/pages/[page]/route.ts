import { NextResponse } from "next/server";

import { getVersesByPage, MUSHAF_TOTAL_PAGES } from "@/lib/quran/queries";

type Context = { params: Promise<{ page: string }> };

export async function GET(request: Request, { params }: Context) {
  const { page } = await params;
  const pageNumber = Number(page);

  if (
    !Number.isInteger(pageNumber) ||
    pageNumber < 1 ||
    pageNumber > MUSHAF_TOTAL_PAGES
  ) {
    return NextResponse.json({ error: "Invalid page number" }, { status: 400 });
  }

  const mushafParam = new URL(request.url).searchParams.get("mushaf");
  const mushafId = mushafParam === "19" ? 19 : 1;

  const result = await getVersesByPage(pageNumber, mushafId);
  return NextResponse.json(
    { ...result, totalPages: MUSHAF_TOTAL_PAGES },
    {
      // Le texte et la traduction d'une page ne changent pas : le navigateur
      // la garde une semaine, le CDN de Vercel un an : une page déjà servie
      // l'est ensuite depuis le CDN le plus proche, sans rappeler l'API
      // Quran Foundation.
      headers: {
        "Cache-Control": "public, max-age=604800, s-maxage=31536000",
      },
    }
  );
}
