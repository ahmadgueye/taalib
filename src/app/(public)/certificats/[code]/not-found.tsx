// Numéro mal recopié, ou certificat pas encore partageable (titulaire sans
// nom) : même réponse, pour ne rien révéler.
export default function CertificateNotFound() {
  return (
    <section
      aria-labelledby="introuvable"
      className="mx-auto flex max-w-xl flex-col gap-2.5 border border-dashed p-8 sm:p-10"
    >
      <h1
        id="introuvable"
        className="font-heading text-3xl font-semibold"
      >
        Certificat introuvable
      </h1>
      <p className="text-muted-foreground">
        Aucun certificat Taalib ne porte ce numéro. Vérifie qu&apos;il est
        recopié exactement, tirets compris.
      </p>
    </section>
  );
}
