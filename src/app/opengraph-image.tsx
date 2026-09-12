import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
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
      <div style={{ display: "flex", fontSize: 56, fontWeight: 700 }}>
        Taalib
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 24,
          fontSize: 32,
          color: "#525252",
          maxWidth: 900,
        }}
      >
        Catalogue de ressources authentiques pour étudier les bases de l&apos;Islam.
      </div>
    </div>,
    { ...size },
  );
}
