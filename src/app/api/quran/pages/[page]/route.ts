import { NextResponse } from "next/server";

import { getVersesByPage, MUSHAF_TOTAL_PAGES } from "@/lib/quran/queries";

type Context = { params: Promise<{ page: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { page } = await params;
  const pageNumber = Number(page);

  if (
    !Number.isInteger(pageNumber) ||
    pageNumber < 1 ||
    pageNumber > MUSHAF_TOTAL_PAGES
  ) {
    return NextResponse.json({ error: "Invalid page number" }, { status: 400 });
  }

  const result = await getVersesByPage(pageNumber);
  return NextResponse.json({ ...result, totalPages: MUSHAF_TOTAL_PAGES });
}
