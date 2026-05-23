import Link from "next/link";
import { ArrowRight, BookOpen, MousePointerClick, Database, Code2, Layers, Lock, Cpu, Server } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getAllDocs, getReadme } from "@/lib/docs";
import { MarkdownView } from "@/components/markdown-view";

export default function HomePage() {
  const docs = getAllDocs();
  const readme = getReadme();

  return (
    <div>
      <div className="mb-12">
        <div className="text-xs font-bold uppercase tracking-widest text-primary mb-3">
          Project Documentation
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
          Team 16 — CleckHive
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Project documentation for the CleckHive marketplace — Laravel + Oracle + APEX.
          Every file, every route, every button explained.
        </p>
      </div>

      {/* Quick start cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
        <QuickCard
          href="/doc/00-plain-english"
          icon={<BookOpen className="w-5 h-5" />}
          title="Plain English"
          subtitle="No coding background? Read this first."
        />
        <QuickCard
          href="/doc/01-overview"
          icon={<BookOpen className="w-5 h-5" />}
          title="Start Here (Developers)"
          subtitle="Laravel primer + MVC + project structure"
        />
        <QuickCard
          href="/doc/02-database"
          icon={<Database className="w-5 h-5" />}
          title="Database"
          subtitle="Every table, every column, every relationship"
        />
        <QuickCard
          href="/doc/05-controllers"
          icon={<Code2 className="w-5 h-5" />}
          title="Controllers"
          subtitle="Every method explained line-by-line"
        />
        <QuickCard
          href="/doc/06-middleware-auth"
          icon={<Lock className="w-5 h-5" />}
          title="Auth & Middleware"
          subtitle="Login flows, role gates, password reset"
        />
        <QuickCard
          href="/buttons/part1-layouts-static"
          icon={<MousePointerClick className="w-5 h-5" />}
          title="Button Reference"
          subtitle="Every interactive element → route mapping"
        />
        <QuickCard
          href="/doc/09-edge-cases"
          icon={<Layers className="w-5 h-5" />}
          title="Edge Cases & Q&A"
          subtitle="Tricky questions an instructor might ask"
        />
        <QuickCard
          href="/doc/10-iot-firmware"
          icon={<Cpu className="w-5 h-5" />}
          title="Direct ORDS Calls"
          subtitle="When the React app skips Laravel and hits ORDS"
        />
        <QuickCard
          href="/apex/11-apex-pages"
          icon={<Server className="w-5 h-5" />}
          title="Oracle APEX Backend"
          subtitle="Auth, functions, triggers, sequences + page SQL reference"
        />
        <QuickCard
          href="/doc/12-iot-connectivity"
          icon={<Cpu className="w-5 h-5" />}
          title="IoT Connectivity"
          subtitle="ESP32 motion sensor → Laravel → RoomMonitor"
        />
      </div>

      {readme && (
        <div className="border-t border-border pt-8">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
            README
          </h2>
          <MarkdownView markdown={readme} />
        </div>
      )}

      <div className="mt-16 text-xs text-muted-foreground border-t border-border pt-6">
        {docs.length} documents available · use the sidebar to navigate
      </div>
    </div>
  );
}

function QuickCard({
  href,
  icon,
  title,
  subtitle,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <Link href={href} className="block group">
      <Card className="hover:border-primary/50 transition-colors h-full">
        <div className="flex items-start gap-3 mb-2">
          <div className="text-primary mt-0.5">{icon}</div>
          <div className="flex-1">
            <div className="font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
              {title}
              <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="text-sm text-muted-foreground mt-1">{subtitle}</div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
