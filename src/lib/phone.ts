import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js/min";

// Numéros de téléphone des étudiants : saisis avec un pays (indicatif) et un
// numéro national, validés puis enregistrés au format international E.164
// (+221771234567) dans profiles.phone.

export const DEFAULT_PHONE_COUNTRY: CountryCode = "SN";

// En tête du sélecteur, dans cet ordre ; les autres pays suivent par nom.
export const PINNED_PHONE_COUNTRIES: CountryCode[] = [
  "SN",
  "FR",
  "ML",
  "CI",
  "MR",
  "GM",
  "GN",
];

export type PhoneCountry = {
  code: CountryCode;
  name: string;
  callingCode: string;
};

export function isPhoneCountry(value: string): value is CountryCode {
  return (getCountries() as string[]).includes(value);
}

export function phoneCountries(): PhoneCountry[] {
  const names = new Intl.DisplayNames(["fr"], { type: "region" });
  return getCountries()
    .map((code) => ({
      code,
      name: names.of(code) ?? code,
      callingCode: getCountryCallingCode(code),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

// Numéro national saisi pour un pays → format E.164, ou null s'il n'est pas
// valide pour ce pays. Un numéro collé avec son indicatif (+33…, 0033…)
// l'emporte sur le pays choisi.
export function toE164(country: string, input: string): string | null {
  const raw = input.trim().replace(/^00/, "+");
  if (!raw) return null;
  const parsed = parsePhoneNumberFromString(
    raw,
    isPhoneCountry(country) ? country : DEFAULT_PHONE_COUNTRY,
  );
  return parsed?.isValid() ? parsed.number : null;
}

// Valeur enregistrée → pays et numéro national pour le formulaire. Un ancien
// numéro saisi en texte libre et illisible reste tel quel, à corriger.
export function splitPhone(value: string | null | undefined): {
  country: CountryCode;
  national: string;
} {
  if (!value) return { country: DEFAULT_PHONE_COUNTRY, national: "" };
  const parsed = parsePhoneNumberFromString(
    value.trim().replace(/^00/, "+"),
    DEFAULT_PHONE_COUNTRY,
  );
  if (parsed?.country && parsed.isValid()) {
    return { country: parsed.country, national: parsed.formatNational() };
  }
  return { country: DEFAULT_PHONE_COUNTRY, national: value };
}

// Affichage (dashboard) : +221 77 123 45 67 ; un ancien numéro illisible est
// affiché tel quel.
export function formatPhone(value: string) {
  const parsed = parsePhoneNumberFromString(value, DEFAULT_PHONE_COUNTRY);
  return parsed?.isValid() ? parsed.formatInternational() : value;
}
