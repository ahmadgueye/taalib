"use client";

import { useState } from "react";
import { Heart, MessageCircle } from "lucide-react";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const WHATSAPP_NUMBER = "221771276922";
const PRESET_AMOUNTS = ["500", "2000", "5000"];

export function DonateDialog() {
  const [amount, setAmount] = useState<string | undefined>(undefined);
  const [customAmount, setCustomAmount] = useState("");

  const selectedAmount = customAmount.trim() || amount;

  const message = selectedAmount
    ? `Assalamou aleykoum, je souhaite faire un don de ${selectedAmount} FCFA pour la plateforme طالب.`
    : "Assalamou aleykoum, je souhaite faire un don pour la plateforme طالب.";

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          setAmount(undefined);
          setCustomAmount("");
        }
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Heart className="text-destructive" />
            Faire un don
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Faire un don</DialogTitle>
          <DialogDescription>
            Cette plateforme est gratuite et vise à rendre le savoir islamique
            accessible à tous. Vos dons nous aident à couvrir les frais
            d&apos;hébergement et à financer la création de nouveaux contenus au
            fur et à mesure.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label>Montant du don</Label>
          <ToggleGroup
            value={amount ? [amount] : []}
            onValueChange={(value) => {
              setAmount(value[0]);
              setCustomAmount("");
            }}
            className="flex gap-2"
          >
            {PRESET_AMOUNTS.map((preset) => (
              <Toggle
                key={preset}
                value={preset}
                className={cn(
                  "flex-1 rounded-lg border border-input px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-muted",
                  "data-pressed:border-primary data-pressed:bg-primary data-pressed:text-primary-foreground",
                )}
              >
                {preset} FCFA
              </Toggle>
            ))}
          </ToggleGroup>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Autre montant (FCFA)"
            value={customAmount}
            onChange={(event) => {
              setCustomAmount(event.target.value);
              if (event.target.value) setAmount(undefined);
            }}
          />
        </div>

        <p className="text-sm text-muted-foreground">
          Le système de don en ligne n&apos;est pas encore disponible, il arrive
          bientôt incha Allah. En attendant, vous pouvez nous contacter
          directement sur WhatsApp pour faire un don.
        </p>
        <Button
          render={
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noopener noreferrer"
            />
          }
          nativeButton={false}
          className="w-full"
        >
          <MessageCircle />
          Contactez-nous sur WhatsApp
        </Button>
      </DialogContent>
    </Dialog>
  );
}
