import { ImageResponse } from "next/og";

import { getContentAccess } from "@/lib/auth/content-access";
import { canSeeSeance } from "@/lib/content-access";
import { getSeanceBySlug } from "@/lib/db/queries/seances";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [found, access] = await Promise.all([getSeanceBySlug(slug), getContentAccess()]);
  // Même règle que la page : rien ne s'affiche de ce qui n'est pas visible.
  const s =
    found &&
    canSeeSeance(access, {
      thematiqueIds: found.seanceThematiques.map((t) => t.thematique.id),
      ressourceIds: found.seanceRessources.map((r) => r.ressource.id),
    })
      ? found
      : null;
  const date = s?.sessionDate
    ? new Date(s.sessionDate).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#fafafa",
          color: "#171717",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, color: "#737373" }}>
          Taalib · Séance de révision
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 20,
            fontSize: 60,
            fontWeight: 700,
            maxWidth: 1000,
          }}
        >
          {s?.title ?? "Séance"}
        </div>
        {date && (
          <div
            style={{ display: "flex", marginTop: 24, fontSize: 28, color: "#525252" }}
          >
            {date}
          </div>
        )}
      </div>
    ),
    { ...size }
  );
}
