"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

// Prévient avant de quitter la page avec des modifications non enregistrées.
// Un clic sur un lien interne (sidebar, fil d'Ariane, bouton Annuler) ouvre
// la boîte de dialogue renvoyée, à afficher dans la page ; la fermeture ou le
// rechargement de l'onglet passe par l'alerte du navigateur, la seule permise
// à ce moment-là. `isDirty` n'est appelée qu'au moment de partir.
export function useLeaveGuard(isDirty: () => boolean) {
  const router = useRouter();
  const check = useRef(isDirty);
  const leaving = useRef(false);
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    check.current = isDirty;
  });

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!leaving.current && check.current()) event.preventDefault();
    }
    function onClick(event: MouseEvent) {
      // Un clic avec modificateur ouvre un nouvel onglet : rien n'est perdu.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const link = (event.target as Element).closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      if (link.target === "_blank" || link.hasAttribute("download")) return;
      if (leaving.current || !check.current()) return;
      event.preventDefault();
      event.stopPropagation();
      setTarget(link.href);
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  function leave() {
    if (!target) return;
    leaving.current = true;
    const url = new URL(target);
    if (url.origin === window.location.origin) {
      router.push(url.pathname + url.search + url.hash);
    } else {
      window.location.assign(target);
    }
    setTarget(null);
  }

  return (
    <AlertDialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) setTarget(null);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Quitter sans enregistrer ?</AlertDialogTitle>
          <AlertDialogDescription>
            Tes modifications ne sont pas enregistrées. Si tu quittes la page
            maintenant, elles seront perdues.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Rester sur la page</AlertDialogCancel>
          <Button variant="destructive" onClick={leave}>
            Quitter sans enregistrer
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function serialize(form: HTMLFormElement) {
  return JSON.stringify(
    [...new FormData(form)].map(([name, value]) => [
      name,
      typeof value === "string" ? value : `${value.name}:${value.size}`,
    ])
  );
}

// La même protection pour un formulaire non contrôlé : ses valeurs au moment
// de partir sont comparées à la référence, prise à l'ouverture de la page puis
// à chaque enregistrement réussi (`markSaved`). `dirty` suit la saisie pour
// l'afficher. À brancher avec `<form ref={formRef}>`, en affichant
// `leaveDialog`.
export function useFormLeaveGuard() {
  const formRef = useRef<HTMLFormElement>(null);
  const initial = useRef<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const isDirty = useCallback(() => {
    const form = formRef.current;
    return (
      form !== null &&
      initial.current !== null &&
      serialize(form) !== initial.current
    );
  }, []);

  const markSaved = useCallback(() => {
    if (formRef.current) initial.current = serialize(formRef.current);
    setDirty(false);
  }, []);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    initial.current = serialize(form);
    // Après l'événement, pour lire les valeurs des champs déjà mises à jour.
    function onEdit() {
      setTimeout(() => setDirty(isDirty()));
    }
    form.addEventListener("input", onEdit);
    form.addEventListener("change", onEdit);
    form.addEventListener("click", onEdit);
    return () => {
      form.removeEventListener("input", onEdit);
      form.removeEventListener("change", onEdit);
      form.removeEventListener("click", onEdit);
    };
  }, [isDirty]);

  const leaveDialog = useLeaveGuard(isDirty);

  return { formRef, leaveDialog, dirty, markSaved };
}
