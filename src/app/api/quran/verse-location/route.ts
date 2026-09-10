import { NextResponse } from "next/server";

import { getVersePage } from "@/lib/quran/queries";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chapterId = Number(searchParams.get("chapter"));
  const verseNumber = Number(searchParams.get("verse"));

  if (!Number.isInteger(chapterId) || !Number.isInteger(verseNumber)) {
    return NextResponse.json(
      { error: "Invalid chapter/verse" },
      { status: 400 }
    );
  }

  const pageNumber = await getVersePage(chapterId, verseNumber);
  return NextResponse.json({ pageNumber });
}
