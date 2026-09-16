import { NextResponse } from "next/server";

import { getVerseAudioUrls } from "@/lib/quran/queries";

type Context = { params: Promise<{ chapter: string }> };

export async function GET(request: Request, { params }: Context) {
  const { chapter } = await params;
  const chapterId = Number(chapter);

  if (!Number.isInteger(chapterId) || chapterId < 1 || chapterId > 114) {
    return NextResponse.json({ error: "Invalid chapter number" }, { status: 400 });
  }

  const recitationParam = new URL(request.url).searchParams.get("recitation");
  const recitationId = Number(recitationParam);
  if (!Number.isInteger(recitationId) || recitationId < 1) {
    return NextResponse.json({ error: "Invalid recitation id" }, { status: 400 });
  }

  const verses = await getVerseAudioUrls(recitationId, chapterId);
  return NextResponse.json({ verses });
}
