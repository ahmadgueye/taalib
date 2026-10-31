const listFormat = new Intl.ListFormat("fr", { type: "conjunction" });

// ["Al-Bukhârî", "Muslim"] → "Al-Bukhârî et Muslim"
export function formatNarrators(
  hadithNarrators: { narrator: { name: string } }[]
) {
  return listFormat.format(hadithNarrators.map((hn) => hn.narrator.name));
}
