import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="text-center py-20">
      <div className="text-7xl font-bold text-primary mb-4">404</div>
      <h1 className="text-2xl font-semibold mb-3">Page not found</h1>
      <p className="text-muted-foreground mb-8">
        The doc you're looking for doesn't exist or hasn't been added yet.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to home
      </Link>
    </div>
  );
}
