// Sans 0/O, 1/I/L : un code se dicte ou se recopie depuis un tableau sans
// ambiguïté.
const INVITE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const INVITE_LENGTH = 8;

export function generateInviteCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(INVITE_LENGTH));
  return Array.from(bytes, (b) => INVITE_ALPHABET[b % INVITE_ALPHABET.length]).join("");
}

// Tolère un code saisi en minuscules ou avec des espaces/tirets.
export function normalizeInviteCode(input: string) {
  return input.toUpperCase().replace(/[\s-]/g, "");
}
