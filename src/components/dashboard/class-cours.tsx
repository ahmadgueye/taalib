"use client";

import { useActionState, useTransition } from "react";
import { Lock, LockOpen } from "lucide-react";
import { toast } from "sonner";

import { DeleteButton } from "@/components/dashboard/delete-button";
import { SubmitButton } from "@/components/dashboard/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addClassCours,
  removeClassCours,
  setThematiqueUnlocked,
  unlockAllThematiques,
  type ActionState,
} from "@/lib/actions/classes";

type CoursOutline = {
  id: string;
  title: string;
  thematiques: { id: string; title: string; unlockedAt: Date | null }[];
};

export function ClassCours({
  classId,
  cours,
  availableCours,
}: {
  classId: string;
  cours: CoursOutline[];
  availableCours: { id: string; title: string }[];
}) {
  return (
    <div className="flex flex-col gap-6">
      {cours.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucun cours dans cette classe.
        </p>
      ) : (
        cours.map((c) => <CoursBlock key={c.id} classId={classId} cours={c} />)
      )}
      <AddCoursForm
        key={availableCours.map((c) => c.id).join(",")}
        classId={classId}
        availableCours={availableCours}
      />
    </div>
  );
}

function AddCoursForm({
  classId,
  availableCours,
}: {
  classId: string;
  availableCours: { id: string; title: string }[];
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    addClassCours.bind(null, classId),
    undefined
  );

  if (availableCours.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Tous les cours existants font déjà partie de cette classe.
      </p>
    );
  }

  const items = availableCours.map((c) => ({ value: c.id, label: c.title }));

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <div className="flex items-start gap-2">
        <Select name="coursId" items={items} required>
          <SelectTrigger className="flex-1" aria-label="Cours à ajouter">
            <SelectValue placeholder="Choisir un cours à ajouter" />
          </SelectTrigger>
          <SelectContent>
            {items.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <SubmitButton>Ajouter</SubmitButton>
      </div>
      {state?.error && <FieldError>{state.error}</FieldError>}
    </form>
  );
}

function CoursBlock({
  classId,
  cours,
}: {
  classId: string;
  cours: CoursOutline;
}) {
  const [isPending, startTransition] = useTransition();
  const unlockedCount = cours.thematiques.filter((t) => t.unlockedAt).length;
  const total = cours.thematiques.length;

  function toggle(thematiqueId: string, unlock: boolean) {
    startTransition(async () => {
      const result = await setThematiqueUnlocked(classId, thematiqueId, unlock);
      if (result.error) toast.error(result.error);
    });
  }

  return (
    <div className="border">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-medium" title={cours.title}>
            {cours.title}
          </p>
          <p className="text-sm text-muted-foreground">
            Thématiques débloquées : {unlockedCount}/{total}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {unlockedCount < total && (
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() =>
                startTransition(() => unlockAllThematiques(classId, cours.id))
              }
            >
              Tout débloquer
            </Button>
          )}
          <DeleteButton
            action={removeClassCours.bind(null, classId, cours.id)}
            itemLabel={cours.title}
            title={`Retirer « ${cours.title} » de la classe ?`}
            description="Le cours n'est pas supprimé. Ses déblocages pour cette classe sont effacés."
            confirmLabel="Retirer"
          />
        </div>
      </div>
      {total === 0 ? (
        <p className="px-4 py-3 text-sm text-muted-foreground">
          Ce cours n&apos;a pas encore de thématique.
        </p>
      ) : (
        <ul className="divide-y">
          {cours.thematiques.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-2 px-4 py-2"
            >
              <span className="min-w-0 truncate text-sm" title={t.title}>
                {t.title}
              </span>
              <div className="flex shrink-0 items-center gap-2">
                {t.unlockedAt ? (
                  <Badge>
                    Débloquée le{" "}
                    {new Date(t.unlockedAt).toLocaleDateString("fr-FR")}
                  </Badge>
                ) : (
                  <Badge variant="secondary">Verrouillée</Badge>
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={isPending}
                  aria-label={
                    t.unlockedAt
                      ? `Verrouiller ${t.title}`
                      : `Débloquer ${t.title}`
                  }
                  onClick={() => toggle(t.id, !t.unlockedAt)}
                >
                  {t.unlockedAt ? (
                    <Lock className="size-4" />
                  ) : (
                    <LockOpen className="size-4" />
                  )}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
