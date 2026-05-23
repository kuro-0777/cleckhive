import { notFound } from "next/navigation";
import { getAllDocs, getDoc } from "@/lib/docs";
import { MarkdownView } from "@/components/markdown-view";
import { PrevNext } from "@/components/prev-next";

export function generateStaticParams() {
  return getAllDocs()
    .filter((d) => d.group === "main")
    .map((d) => ({ slug: d.slug }));
}

export default function DocPage({ params }: { params: { slug: string } }) {
  const doc = getDoc("main", params.slug);
  if (!doc) notFound();

  const all = getAllDocs().filter((d) => d.group === "main");
  const idx = all.findIndex((d) => d.slug === params.slug);
  const prev = idx > 0 ? all[idx - 1] : null;
  const next = idx < all.length - 1 ? all[idx + 1] : null;

  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-widest text-primary mb-2">
        Main Docs
      </div>
      <h1 className="text-3xl font-bold mb-8 leading-tight">{doc.title}</h1>

      <MarkdownView markdown={doc.markdown} />

      <PrevNext prev={prev ? { href: `/doc/${prev.slug}`, label: prev.title } : null}
                next={next ? { href: `/doc/${next.slug}`, label: next.title } : null} />
    </div>
  );
}
