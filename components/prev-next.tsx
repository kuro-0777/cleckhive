import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function PrevNext({
  prev,
  next,
}: {
  prev: { href: string; label: string } | null;
  next: { href: string; label: string } | null;
}) {
  return (
    <div className={cn("mt-16 pt-8 border-t border-border grid gap-3", prev && next ? "grid-cols-2" : "grid-cols-1")}>
      {prev && (
        <Link
          href={prev.href}
          className="group rounded-md border border-border p-4 hover:border-primary/50 transition-colors"
        >
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <ChevronLeft className="w-3 h-3" /> Previous
          </div>
          <div className="font-medium text-sm group-hover:text-primary transition-colors">
            {prev.label}
          </div>
        </Link>
      )}
      {next && (
        <Link
          href={next.href}
          className={cn(
            "group rounded-md border border-border p-4 hover:border-primary/50 transition-colors",
            !prev && "col-start-1",
            prev && "text-right"
          )}
        >
          <div className={cn("flex items-center gap-1 text-xs text-muted-foreground mb-1", prev && "justify-end")}>
            Next <ChevronRight className="w-3 h-3" />
          </div>
          <div className="font-medium text-sm group-hover:text-primary transition-colors">
            {next.label}
          </div>
        </Link>
      )}
    </div>
  );
}
