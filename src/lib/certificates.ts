// Numéro d'un certificat : TAA- puis deux groupes de 4 caractères tirés au
// hasard (~40 bits), pour qu'on ne puisse pas parcourir les certificats des
// autres en devinant des numéros. Même alphabet que les codes d'invitation :
// sans 0/O ni 1/I/L, il se recopie sans ambiguïté.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_PATTERN = /^TAA-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/;

export function generateCertificateCode() {
  const chars: string[] = [];
  // Tirage par rejet : un octet ≥ 248 (31 × 8) biaiserait le modulo.
  while (chars.length < 8) {
    for (const b of crypto.getRandomValues(new Uint8Array(16))) {
      if (b < 248 && chars.length < 8) {
        chars.push(CODE_ALPHABET[b % CODE_ALPHABET.length]);
      }
    }
  }
  return `TAA-${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}

// Tolère un numéro saisi en minuscules ou avec des espaces ; null s'il n'a
// pas la forme d'un numéro (la page répond alors 404 sans requête).
export function normalizeCertificateCode(input: string) {
  const code = input.trim().toUpperCase().replace(/\s+/g, "");
  return CODE_PATTERN.test(code) ? code : null;
}

export function certificatePath(code: string) {
  return `/certificats/${code}`;
}

// Adresse complète, imprimée sur le certificat et encodée dans son QR code.
export function certificateUrl(code: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return new URL(certificatePath(code), base).toString();
}

function plural(n: number, singular: string, pluralForm: string) {
  return `${n} ${n > 1 ? pluralForm : singular}`;
}

// « 12 leçons lues et 3 quiz réussis », sans la partie quiz si la thématique
// n'en avait pas.
export function validationSummary(lessons: number, quizzes: number) {
  const parts = [plural(lessons, "leçon lue", "leçons lues")];
  if (quizzes > 0) parts.push(plural(quizzes, "quiz réussi", "quiz réussis"));
  return parts.join(" et ");
}
