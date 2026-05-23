import { notFound } from "next/navigation";
import { getAllDocs, getDoc } from "@/lib/docs";
import { MarkdownView } from "@/components/markdown-view";
import { PrevNext } from "@/components/prev-next";

export function generateStaticParams() {
  return getAllDocs()
    .filter((d) => d.group === "buttons")
    .map((d) => ({ slug: d.slug }));
}

export default function ButtonsDocPage({
  params,
}: {
  params: { slug: string };
}) {
  const doc = getDoc("buttons", params.slug);
  if (!doc) notFound();

  const all = getAllDocs().filter((d) => d.group === "buttons");
  const idx = all.findIndex((d) => d.slug === params.slug);
  const prev = idx > 0 ? all[idx - 1] : null;
  const next = idx < all.length - 1 ? all[idx + 1] : null;

  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-widest text-primary mb-2">
        Button Reference
      </div>
      <h1 className="text-3xl font-bold mb-8 leading-tight">{doc.title}</h1>

      <MarkdownView markdown={doc.markdown} />

      <PrevNext
        prev={prev ? { href: `/buttons/${prev.slug}`, label: prev.title } : null}
        next={next ? { href: `/buttons/${next.slug}`, label: next.title } : null}
      />
    </div>
  );
}
