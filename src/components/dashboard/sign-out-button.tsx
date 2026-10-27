"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/lib/actions/auth";

export function SignOutButton({ className }: { className?: string }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={<Button variant="outline" size="sm" className={className} />}
      >
        Se déconnecter
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Tu pars déjà ?</AlertDialogTitle>
          <AlertDialogDescription>
            Tu pourras te reconnecter à tout moment et reprendre là où tu en
            étais.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Rester</AlertDialogCancel>
          <form action={signOutAction}>
            <AlertDialogAction type="submit">
              Se déconnecter
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
