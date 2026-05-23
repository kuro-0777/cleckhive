import "./globals.css";
import type { Metadata } from "next";
import { Sidebar } from "@/components/sidebar";
import { getAllDocs } from "@/lib/docs";

export const metadata: Metadata = {
  title: "Cleck Hudders Grocers — Documentation",
  description:
    "Beginner-friendly docs for the Cleck Hudders Grocers Laravel + Oracle + APEX project.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const docs = getAllDocs();

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <div className="flex">
          <Sidebar docs={docs} />
          <main className="flex-1 min-w-0">
            <div className="max-w-4xl mx-auto px-8 py-12">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
