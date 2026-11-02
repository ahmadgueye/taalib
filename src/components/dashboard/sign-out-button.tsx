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
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { signOutAction } from "@/lib/actions/auth";

// `menu` : une ligne de menu (menu du compte), avec son icône. `icon` ajoute
// l'icône au bouton à bordure.
export function SignOutButton({
  className,
  variant = "outline",
  icon = variant === "menu",
}: {
  className?: string;
  variant?: "outline" | "menu";
  icon?: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            variant={variant === "menu" ? "ghost" : "outline"}
            size={variant === "menu" ? "lg" : "sm"}
            className={className}
          />
        }
      >
        {icon && <LogOut />}
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
          {/* Le form s'étire avec le pied de la fenêtre sur mobile ; le
              bouton doit suivre, comme « Rester ». */}
          <form action={signOutAction}>
            <AlertDialogAction type="submit" className="w-full sm:w-auto">
              Se déconnecter
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
