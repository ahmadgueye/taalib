"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/dashboard/submit-button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { PhoneField } from "@/components/public/phone-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateProfileAction, type ActionState } from "@/lib/actions/auth";
import { DEFAULT_PHONE_COUNTRY, isPhoneCountry } from "@/lib/phone";

type Values = {
  firstName: string;
  lastName: string;
  phoneCountry: string;
  phone: string;
  address: string;
  birthDate: string;
};

// Formulaire du profil : à l'inscription (`onboarding`) et dans les
// paramètres du compte. Le staff (`staff`) ne renseigne que son prénom et
// son nom.
export function ProfileForm({
  defaults,
  next,
  onboarding = false,
  staff = false,
}: {
  defaults: Values;
  next: string;
  onboarding?: boolean;
  staff?: boolean;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    updateProfileAction,
    undefined,
  );
  const values = { ...defaults, ...state?.values };
  const today = new Date().toISOString().slice(0, 10);

  return (
    // Remonté après une erreur pour réafficher la saisie (React vide le
    // formulaire après chaque envoi).
    <form key={JSON.stringify(state?.values ?? null)} action={formAction}>
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="firstName">Prénom</FieldLabel>
            <Input
              id="firstName"
              name="firstName"
              autoComplete="given-name"
              defaultValue={values.firstName}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="lastName">Nom</FieldLabel>
            <Input
              id="lastName"
              name="lastName"
              autoComplete="family-name"
              defaultValue={values.lastName}
              required
            />
          </Field>
        </div>
        {!staff && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="phone">Téléphone</FieldLabel>
                <PhoneField
                  id="phone"
                  defaultCountry={
                    isPhoneCountry(values.phoneCountry)
                      ? values.phoneCountry
                      : DEFAULT_PHONE_COUNTRY
                  }
                  defaultNumber={values.phone}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="birthDate">Date de naissance</FieldLabel>
                <Input
                  id="birthDate"
                  name="birthDate"
                  type="date"
                  autoComplete="bday"
                  max={today}
                  defaultValue={values.birthDate}
                  required
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="address">Adresse</FieldLabel>
              <Textarea
                id="address"
                name="address"
                autoComplete="street-address"
                rows={2}
                defaultValue={values.address}
                required
              />
              <FieldDescription>
                Quartier, ville et pays suffisent.
              </FieldDescription>
            </Field>
          </>
        )}
        <input type="hidden" name="next" value={next} />
        {onboarding && <input type="hidden" name="onboarding" value="1" />}
        {state?.error && <FieldError>{state.error}</FieldError>}
        <SubmitButton className="w-fit">
          {onboarding ? "Continuer" : "Enregistrer"}
        </SubmitButton>
      </FieldGroup>
    </form>
  );
}
