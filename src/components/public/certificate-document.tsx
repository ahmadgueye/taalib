import { Herr_Von_Muellerhoff } from "next/font/google";
import QRCode from "qrcode";

import { certificateUrl, validationSummary } from "@/lib/certificates";
import { LOGO_HEIGHT, LOGO_PATH, LOGO_WIDTH } from "@/lib/logo-path";

// Deux mises en page du même certificat, choisies par la largeur de son
// conteneur : paysage (A4, dessiné pour 1123 × 794 px) et, sous 36rem (un
// téléphone), portrait (dessiné pour 360 px de large), où le texte reste
// lisible. Dans chacune, toutes les mesures sont en unités de conteneur : la
// mise en page est conservée, réduite ou agrandie, à toutes les largeurs.
type Unit = (px: number) => string;
const containerUnit =
  (designWidth: number): Unit =>
  (px) =>
    `${((px * 100) / designWidth).toFixed(3)}cqw`;
const landscape = containerUnit(1123);
const portrait = containerUnit(360);
// Les éléments partagés (signature, sceau…) sont dessinés à l'échelle du
// paysage : en portrait, on les réduit.
const scaled =
  (unit: Unit, factor: number): Unit =>
  (px) =>
    unit(px * factor);

// Signature du fondateur : une écriture manuscrite stylisée, volontairement
// pas sa vraie signature (l'image est publique). Chargée seulement ici.
// Chaque lettre est un peu décalée, penchée et plus ou moins grande, pour
// casser la régularité d'une police.
const signatureFont = Herr_Von_Muellerhoff({
  subsets: ["latin"],
  weight: "400",
  preload: false,
});

// Couleurs fixes : un certificat reste crème et brun, même en thème sombre.
const INK = "#21140f";
const CREAM = "#f5f5ed";
const TEXT_SOFT = "#4a3a2c";
const ACCENT = "#f86c3d";

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

// [lettre, inclinaison en degrés, décalage vertical en px, échelle]
const SIGNATURE: [string, number, number, number][] = [
  ["M", -4, 2, 1.12],
  [".", 0, 1, 1],
  [" ", 0, 0, 1],
  ["A", 5, -3, 1.08],
  ["h", -3, 1, 0.94],
  ["m", 2, 2, 0.9],
  ["a", -5, 0, 0.96],
  ["d", 6, -2, 1.05],
];

export type CertificateData = {
  code: string;
  recipientName: string;
  thematiqueTitle: string;
  coursTitle: string;
  lessonCount: number;
  quizCount: number;
  issuedAt: Date;
};

export function CertificateDocument({
  certificate,
}: {
  certificate: CertificateData;
}) {
  // Une seule des deux versions est affichée : l'autre est en display: none,
  // donc absente aussi pour les lecteurs d'écran.
  return (
    <div className="@container w-full">
      <div className="@max-xl:hidden">
        <LandscapeCertificate c={certificate} />
      </div>
      <div className="@xl:hidden">
        <PortraitCertificate c={certificate} />
      </div>
    </div>
  );
}

function LandscapeCertificate({ c }: { c: CertificateData }) {
  const u = landscape;
  const url = certificateUrl(c.code);
  return (
    <Frame c={c} unit={u} aspectRatio="1123 / 794" patternId="girih-landscape">
      <div
        style={{
          margin: u(10),
          padding: `0 ${u(48)} ${u(54)}`,
          borderWidth: "1px",
          borderColor: "rgba(33,20,15,0.22)",
        }}
        className="relative flex flex-1 flex-col"
      >
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <p style={{ fontSize: u(20), color: TEXT_SOFT }}>
            Ce certificat est décerné à
          </p>
          <p
            style={{ marginTop: u(14), fontSize: u(80), lineHeight: 1.05 }}
            className="font-heading font-bold"
          >
            {c.recipientName}
          </p>
          <Ornament unit={u} />
          <p style={{ marginTop: u(22), fontSize: u(20), color: TEXT_SOFT }}>
            pour avoir validé l&apos;intégralité de la thématique
          </p>
          <p
            style={{
              marginTop: u(10),
              fontSize: u(48),
              lineHeight: 1.12,
              maxWidth: u(880),
            }}
            className="font-heading font-bold text-balance"
          >
            {c.thematiqueTitle}
          </p>
          <p style={{ marginTop: u(14), fontSize: u(20), color: TEXT_SOFT }}>
            du cours {c.coursTitle}
          </p>
          <p style={{ marginTop: u(26), fontSize: u(16), color: TEXT_SOFT }}>
            {issuedLine(c)}
          </p>
        </div>

        <div style={{ gap: u(24) }} className="grid grid-cols-3 items-center">
          <VerifyBlock c={c} url={url} unit={u} qrSize={92} textSize={12} />
          <Signature unit={u} nameSize={u(14)} />
          <div className="flex justify-end">
            <Seal unit={u} />
          </div>
        </div>
      </div>
    </Frame>
  );
}

function PortraitCertificate({ c }: { c: CertificateData }) {
  const p = portrait;
  const url = certificateUrl(c.code);
  return (
    <Frame c={c} unit={scaled(p, 0.62)} patternId="girih-portrait">
      <div
        style={{
          margin: p(6),
          padding: `${p(30)} ${p(18)} ${p(40)}`,
          borderWidth: "1px",
          borderColor: "rgba(33,20,15,0.22)",
        }}
        className="relative flex flex-col items-center text-center"
      >
        <p style={{ fontSize: p(14), color: TEXT_SOFT }}>
          Ce certificat est décerné à
        </p>
        <p
          style={{ marginTop: p(8), fontSize: p(34), lineHeight: 1.1 }}
          className="font-heading font-bold text-balance"
        >
          {c.recipientName}
        </p>
        <Ornament unit={scaled(p, 0.6)} />
        <p style={{ marginTop: p(16), fontSize: p(14), color: TEXT_SOFT }}>
          pour avoir validé l&apos;intégralité de la thématique
        </p>
        <p
          style={{ marginTop: p(6), fontSize: p(23), lineHeight: 1.15 }}
          className="font-heading font-bold text-balance"
        >
          {c.thematiqueTitle}
        </p>
        <p style={{ marginTop: p(8), fontSize: p(14), color: TEXT_SOFT }}>
          du cours {c.coursTitle}
        </p>
        <p style={{ marginTop: p(14), fontSize: p(13), color: TEXT_SOFT }}>
          {issuedLine(c)}
        </p>

        <div style={{ marginTop: p(34) }}>
          <Signature unit={scaled(p, 0.75)} nameSize={p(13)} />
        </div>

        <div
          style={{ marginTop: p(30), gap: p(12) }}
          className="flex w-full items-center justify-between text-left"
        >
          <VerifyBlock c={c} url={url} unit={p} qrSize={64} textSize={10} />
          <Seal unit={scaled(p, 0.6)} />
        </div>
      </div>
    </Frame>
  );
}

function issuedLine(c: CertificateData) {
  return `le ${dateFormat.format(c.issuedAt)}, après ${validationSummary(c.lessonCount, c.quizCount)}`;
}

// Cadre brun, fond crème à motif et bandeau aux logos de Taalib et de Bayān,
// communs aux deux mises en page. `unit` règle la taille du bandeau.
function Frame({
  c,
  unit: u,
  aspectRatio,
  patternId,
  children,
}: {
  c: CertificateData;
  unit: Unit;
  aspectRatio?: string;
  patternId: string;
  children: React.ReactNode;
}) {
  const logoHeight = 46;
  return (
    <article
      aria-label={`Certificat de réussite de ${c.recipientName}`}
      style={{ aspectRatio, padding: u(14), background: INK, color: INK }}
      className="font-sans"
    >
      <div
        style={{ background: CREAM }}
        className="relative flex h-full flex-col overflow-hidden"
      >
        <GirihPattern id={patternId} />
        <header
          style={{ height: u(96), gap: u(28), background: INK }}
          className="relative flex shrink-0 items-center justify-center"
        >
          <svg
            role="img"
            aria-label="Taalib"
            viewBox={`0 0 ${LOGO_WIDTH} ${LOGO_HEIGHT}`}
            style={{
              height: u(logoHeight),
              width: u((logoHeight * LOGO_WIDTH) / LOGO_HEIGHT),
            }}
          >
            <path d={LOGO_PATH} fill={CREAM} />
          </svg>
          <span
            aria-hidden
            style={{
              width: "1.5px",
              height: u(46),
              background: "rgba(245,245,237,0.55)",
            }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element -- petit
              logo fixe, sans intérêt à passer par next/image */}
          <img
            src="/brand/bayan-mark-cream.png"
            alt="Bayān"
            style={{ width: u(46), height: u(46) }}
          />
        </header>
        {children}
      </div>
    </article>
  );
}

// QR code et adresse de la page publique.
function VerifyBlock({
  c,
  url,
  unit: u,
  qrSize,
  textSize,
}: {
  c: CertificateData;
  url: string;
  unit: Unit;
  qrSize: number;
  textSize: number;
}) {
  return (
    <div style={{ gap: u(14) }} className="flex min-w-0 items-center">
      <QrCode url={url} size={u(qrSize)} padding={u(qrSize / 18)} />
      <div
        style={{ gap: u(3), fontSize: u(textSize), color: TEXT_SOFT }}
        className="flex min-w-0 flex-col"
      >
        <span>Vérifier ce certificat :</span>
        <span className="font-semibold break-all" style={{ color: INK }}>
          {url.replace(/^https?:\/\//, "").replace(c.code, "")}
        </span>
        <span className="font-bold tracking-wide" style={{ color: INK }}>
          {c.code}
        </span>
      </div>
    </div>
  );
}

// Signature du fondateur posée sur le trait, puis son nom.
function Signature({ unit: u, nameSize }: { unit: Unit; nameSize: string }) {
  return (
    <div style={{ gap: u(4) }} className="flex flex-col items-center text-center">
      {/* La signature déborde sur le trait, comme à la main. */}
      <span
        aria-hidden
        style={{
          fontSize: u(54),
          lineHeight: 1,
          marginBottom: u(-18),
          color: INK,
        }}
        className={`${signatureFont.className} whitespace-nowrap`}
      >
        {SIGNATURE.map(([char, rotate, dy, scale], i) => (
          <span
            key={i}
            style={{
              transform: `translateY(${u(dy)}) rotate(${rotate}deg) scale(${scale})`,
            }}
            className="inline-block"
          >
            {char === " " ? " " : char}
          </span>
        ))}
      </span>
      <span
        aria-hidden
        style={{
          width: u(200),
          height: "1px",
          marginBottom: u(8),
          background: "rgba(33,20,15,0.35)",
        }}
      />
      <span style={{ fontSize: nameSize }}>
        <strong>Ahmad</strong>, Fondateur Bayān
      </span>
    </div>
  );
}

// Séparateur sous le nom : un trait, l'étoile à quatre branches du logo
// Bayān (celle du motif de fond), un trait.
function Ornament({ unit: u }: { unit: Unit }) {
  const line = { width: u(72), height: "1px", background: "rgba(33,20,15,0.3)" };
  return (
    <div
      aria-hidden
      style={{ marginTop: u(20), gap: u(14) }}
      className="flex items-center"
    >
      <span style={line} />
      <svg viewBox="20 20 16 16" style={{ width: u(16), height: u(16) }}>
        <path
          d="M28 20Q29.5 26.5 36 28Q29.5 29.5 28 36Q26.5 29.5 20 28Q26.5 26.5 28 20Z"
          fill={INK}
        />
      </svg>
      <span style={line} />
    </div>
  );
}

// Losanges très clairs, avec à chaque croisement la petite étoile à quatre
// branches du logo Bayān. Motif de taille fixe : il se répète sur toute la
// surface, quel que soit le format.
function GirihPattern({ id }: { id: string }) {
  return (
    <svg aria-hidden className="absolute inset-0 size-full">
      <defs>
        <pattern id={id} width="48" height="48" patternUnits="userSpaceOnUse">
          <g transform="scale(0.8571)">
            <path
              d="M28 0L56 28L28 56L0 28Z"
              fill="none"
              stroke="rgba(33,20,15,0.07)"
              strokeWidth="1.17"
            />
            <path
              d="M28 20Q29.5 26.5 36 28Q29.5 29.5 28 36Q26.5 29.5 20 28Q26.5 26.5 28 20Z"
              fill="rgba(33,20,15,0.07)"
            />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

// Sceau : étoile à huit branches (deux carrés superposés) en brun, le logo
// Bayān au centre et deux rubans orange. La boîte ne compte que l'étoile :
// les rubans en débordent, pour que l'étoile s'aligne au centre du pied de
// page avec le QR code et la signature.
function Seal({ unit: u }: { unit: Unit }) {
  const ribbon = {
    top: u(72),
    width: u(26),
    height: u(64),
    background: ACCENT,
    clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 82%, 0 100%)",
  };
  const square = {
    left: u(18),
    top: u(4),
    width: u(84),
    height: u(84),
    background: INK,
  };
  return (
    <div
      aria-hidden
      style={{ width: u(120), height: u(92) }}
      className="relative shrink-0"
    >
      <div style={{ ...ribbon, left: u(30) }} className="absolute rotate-[14deg]" />
      <div style={{ ...ribbon, left: u(64) }} className="absolute -rotate-[14deg]" />
      <div style={square} className="absolute" />
      <div style={square} className="absolute rotate-45" />
      <div
        style={{
          left: u(27),
          top: u(13),
          width: u(66),
          height: u(66),
          border: "1.5px solid rgba(245,245,237,0.7)",
        }}
        className="absolute rotate-45"
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- voir l'en-tête */}
      <img
        src="/brand/bayan-mark-cream.png"
        alt=""
        style={{ left: u(39), top: u(25), width: u(42), height: u(42) }}
        className="absolute"
      />
    </div>
  );
}

// QR code vers la page publique, dessiné en SVG côté serveur.
function QrCode({
  url,
  size,
  padding,
}: {
  url: string;
  size: string;
  padding: string;
}) {
  const { modules } = QRCode.create(url, { errorCorrectionLevel: "M" });
  let d = "";
  for (let y = 0; y < modules.size; y++) {
    for (let x = 0; x < modules.size; x++) {
      if (modules.get(y, x)) d += `M${x} ${y}h1v1h-1z`;
    }
  }
  return (
    <svg
      role="img"
      aria-label="QR code vers la page de vérification du certificat"
      viewBox={`0 0 ${modules.size} ${modules.size}`}
      shapeRendering="crispEdges"
      style={{ width: size, height: size, padding, background: "#ffffff" }}
      className="shrink-0"
    >
      <path d={d} fill={INK} />
    </svg>
  );
}
