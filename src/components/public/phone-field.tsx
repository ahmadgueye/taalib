"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  AsYouType,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js/min";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  PINNED_PHONE_COUNTRIES,
  phoneCountries,
  type PhoneCountry,
} from "@/lib/phone";
import { cn } from "@/lib/utils";

// Téléphone en deux parties : le pays (drapeau + indicatif, avec recherche)
// et le numéro national, mis en forme pendant la saisie. Envoie
// `phoneCountry` et `phone` ; le serveur valide et enregistre en E.164
// (lib/phone.ts).
export function PhoneField({
  id,
  defaultCountry,
  defaultNumber,
  required,
}: {
  id: string;
  defaultCountry: CountryCode;
  defaultNumber: string;
  required?: boolean;
}) {
  const countries = useMemo(() => phoneCountries(), []);
  const pinned = useMemo(
    () =>
      PINNED_PHONE_COUNTRIES.map((code) =>
        countries.find((c) => c.code === code),
      ).filter((c): c is PhoneCountry => Boolean(c)),
    [countries],
  );

  const [open, setOpen] = useState(false);
  const [country, setCountry] = useState<CountryCode>(defaultCountry);
  const [number, setNumber] = useState(() =>
    formatAsYouType(defaultCountry, defaultNumber),
  );

  function chooseCountry(code: CountryCode) {
    setCountry(code);
    setNumber((current) => formatAsYouType(code, current));
    setOpen(false);
  }

  function changeNumber(value: string) {
    // Numéro collé avec son indicatif : le pays suit.
    const international = value.trim().replace(/^00/, "+");
    if (international.startsWith("+")) {
      const parsed = parsePhoneNumberFromString(international);
      if (parsed?.country) {
        setCountry(parsed.country);
        setNumber(parsed.formatNational());
        return;
      }
    }
    // Effacer un espace de mise en forme ne retire aucun chiffre : la mise
    // en forme le remettrait aussitôt. On efface alors le chiffre d'avant.
    const digits = value.replace(/\D/g, "");
    if (value.length < number.length && digits === number.replace(/\D/g, "")) {
      setNumber(formatAsYouType(country, digits.slice(0, -1)));
      return;
    }
    setNumber(formatAsYouType(country, value));
  }

  const current = countries.find((c) => c.code === country);

  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              className="shrink-0 gap-1.5 px-2.5 font-normal"
              aria-label={`Indicatif : ${current?.name ?? country} (+${getCountryCallingCode(country)})`}
            />
          }
        >
          <Flag code={country} />
          <span className="tabular-nums">
            +{getCountryCallingCode(country)}
          </span>
          <ChevronsUpDown className="size-3.5 text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <Command filter={matchCountry}>
            <CommandInput placeholder="Rechercher un pays ou un indicatif…" />
            <CommandList>
              <CommandEmpty>Aucun pays trouvé.</CommandEmpty>
              <CommandGroup>
                {pinned.map((c) => (
                  <CountryItem
                    key={`pinned-${c.code}`}
                    country={c}
                    selected={c.code === country}
                    onSelect={chooseCountry}
                  />
                ))}
              </CommandGroup>
              <CommandGroup heading="Tous les pays">
                {countries.map((c) => (
                  <CountryItem
                    key={c.code}
                    country={c}
                    selected={c.code === country}
                    onSelect={chooseCountry}
                  />
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Input
        id={id}
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        value={number}
        onChange={(e) => changeNumber(e.target.value)}
        required={required}
        className="min-w-0 flex-1 tabular-nums"
      />
      <input type="hidden" name="phoneCountry" value={country} />
    </div>
  );
}

function CountryItem({
  country,
  selected,
  onSelect,
}: {
  country: PhoneCountry;
  selected: boolean;
  onSelect: (code: CountryCode) => void;
}) {
  return (
    <CommandItem
      // Recherche par nom, indicatif (« 221 », « +221 ») ou code ISO.
      value={`${country.name} +${country.callingCode} ${country.code}`}
      onSelect={() => onSelect(country.code)}
    >
      <Flag code={country.code} />
      <span className="flex-1 truncate">{country.name}</span>
      <span className="text-muted-foreground tabular-nums">
        +{country.callingCode}
      </span>
      <Check className={cn("size-4", !selected && "invisible")} />
    </CommandItem>
  );
}

// Drapeaux servis depuis public/flags/ (scripts/copy-flags.mjs) : seuls ceux
// affichés sont téléchargés.
function Flag({ code }: { code: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/flags/${code}.svg`}
      alt=""
      width={21}
      height={14}
      loading="lazy"
      className="h-3.5 w-[21px] shrink-0 rounded-[2px] object-cover shadow-[0_0_0_1px_rgb(0_0_0/0.08)]"
    />
  );
}

// Recherche exacte (pas floue), sans tenir compte des accents ni de la
// casse. Des chiffres cherchent le début de l'indicatif : « 33 » trouve la
// France (+33), pas le Ghana (+233).
function matchCountry(value: string, search: string) {
  const digits = /^\+?(\d+)$/.exec(search.trim());
  if (digits) {
    const callingCode = /\+(\d+)/.exec(value)?.[1] ?? "";
    return callingCode.startsWith(digits[1]) ? 1 : 0;
  }
  const normalize = (text: string) =>
    text
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();
  return normalize(value).includes(normalize(search).trim()) ? 1 : 0;
}

function formatAsYouType(country: CountryCode, value: string) {
  return new AsYouType(country).input(value);
}
