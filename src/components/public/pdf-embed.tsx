export function PdfEmbed({ url, title }: { url: string; title: string }) {
  return (
    <iframe
      src={url}
      title={title}
      className="h-[80vh] w-full rounded-lg border"
    />
  );
}
