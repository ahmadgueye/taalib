import type { Metadata } from "next";

import { InviteCodeForm } from "@/components/public/invite-code-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Rejoindre une classe — Taalib",
  robots: { index: false, follow: false },
};

export default function RejoindrePage() {
  return (
    <div className="mx-auto w-full max-w-sm py-8">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Rejoindre une classe</CardTitle>
          <CardDescription>
            Saisis le code d&apos;invitation donné par ton enseignant.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InviteCodeForm />
        </CardContent>
      </Card>
    </div>
  );
}
