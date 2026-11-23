// Copie les drapeaux (country-flag-icons, format 3:2) dans public/flags/
// pour le sélecteur d'indicatif téléphonique : servis comme fichiers
// statiques, le navigateur ne télécharge que ceux qui s'affichent, au lieu
// d'embarquer ~1 Mo de SVG dans le JavaScript. Lancé avant `dev` et `build`
// (scripts predev / prebuild) ; public/flags/ est ignoré par git.
import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

import { getCountries } from "libphonenumber-js/min";

const require = createRequire(import.meta.url);
const source = path.join(
  path.dirname(require.resolve("country-flag-icons/package.json")),
  "3x2",
);
const target = path.join(process.cwd(), "public", "flags");

await mkdir(target, { recursive: true });
const countries = getCountries();
await Promise.all(
  countries.map((code) =>
    copyFile(
      path.join(source, `${code}.svg`),
      path.join(target, `${code}.svg`),
    ),
  ),
);
console.log(`copy-flags: ${countries.length} drapeaux dans public/flags/`);
