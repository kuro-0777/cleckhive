"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BookOpen, MousePointerClick, Home, Database } from "lucide-react";
import type { DocSection } from "@/lib/docs";

type Props = {
  docs: DocSection[];
};

export function Sidebar({ docs }: Props) {
  const pathname = usePathname();
  const mainDocs = docs.filter((d) => d.group === "main");
  const apexDocs = docs.filter((d) => d.group === "apex");
  const buttonDocs = docs.filter((d) => d.group === "buttons");

  return (
    <aside className="w-72 shrink-0 border-r border-border bg-sidebar h-screen sticky top-0 overflow-y-auto">
      <div className="px-6 py-6 border-b border-border">
        <Link href="/" className="block">
          <div className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">
            Documentation
          </div>
          <div className="text-base font-bold text-foreground leading-tight">
            Team 16 — CleckHive
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Laravel + Oracle + APEX
          </div>
        </Link>
      </div>

      <nav className="px-3 py-4">
        <NavItem
          href="/"
          label="Home"
          icon={<Home className="w-4 h-4" />}
          active={pathname === "/"}
        />

        <SectionLabel icon={<BookOpen className="w-3.5 h-3.5" />} label="Main Docs" />
        <div className="space-y-0.5">
          {mainDocs.map((d) => (
            <NavItem
              key={d.slug}
              href={`/doc/${d.slug}`}
              label={d.title}
              active={pathname === `/doc/${d.slug}`}
              compact
            />
          ))}
        </div>

        <SectionLabel
          icon={<Database className="w-3.5 h-3.5" />}
          label="Oracle APEX Backend"
        />
        <div className="space-y-0.5">
          {apexDocs.map((d) => (
            <NavItem
              key={d.slug}
              href={`/apex/${d.slug}`}
              label={d.title}
              active={pathname === `/apex/${d.slug}`}
              compact
            />
          ))}
        </div>

        <SectionLabel
          icon={<MousePointerClick className="w-3.5 h-3.5" />}
          label="Button Reference"
        />
        <div className="space-y-0.5">
          {buttonDocs.map((d) => (
            <NavItem
              key={d.slug}
              href={`/buttons/${d.slug}`}
              label={d.title}
              active={pathname === `/buttons/${d.slug}`}
              compact
            />
          ))}
        </div>
      </nav>

      <div className="px-6 py-4 text-xs text-muted-foreground border-t border-border mt-4">
        Built with Next.js · Tailwind · shadcn
      </div>
    </aside>
  );
}

function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 mt-6 mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
      {icon}
      {label}
    </div>
  );
}

function NavItem({
  href,
  label,
  active,
  compact,
  icon,
}: {
  href: string;
  label: string;
  active: boolean;
  compact?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 px-3 rounded-md text-sm transition-colors",
        compact ? "py-1.5" : "py-2 font-medium",
        active
          ? "bg-primary/15 text-primary border-l-2 border-primary pl-[10px]"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
    </Link>
  );
}
