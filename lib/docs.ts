import fs from "node:fs";
import path from "node:path";

// Markdown files live in the repo-local ./docs folder.
// Override with DOCS_PATH env var if you keep them elsewhere
// (e.g. DOCS_PATH=../some-other-repo/docs npm run dev).
const DOCS_ROOT = process.env.DOCS_PATH
  ? path.resolve(process.cwd(), process.env.DOCS_PATH)
  : path.resolve(process.cwd(), "docs");

export type DocSection = {
  /** Title shown in the sidebar */
  title: string;
  /** URL slug, e.g. "01-overview" */
  slug: string;
  /** Group: main Laravel docs, button reference, or Oracle APEX backend */
  group: "main" | "buttons" | "apex";
  /** Absolute path to the markdown file on disk */
  filePath: string;
};

const MAIN_TITLES: Record<string, string> = {
  "00-plain-english": "00 — Plain English (Start Here If You Don't Code)",
  "01-overview": "01 — Overview & Laravel Primer",
  "02-database": "02 — Database & Migrations",
  "03-models": "03 — Models",
  "04-routes": "04 — Routes",
  "05-controllers": "05 — Controllers",
  "06-middleware-auth": "06 — Middleware & Auth",
  "07-views": "07 — Views & Buttons",
  "08-tailwind": "08 — Tailwind CSS Reference",
  "09-edge-cases": "09 — Edge Cases & Instructor Q&A",
  "10-iot-firmware": "10 — Direct ORDS Calls from React",
  "12-iot-connectivity": "12 — IoT Connectivity (ESP32 + Motion)",
};

/** Oracle APEX backend — lives under /apex/<slug> routes. */
const APEX_TITLES: Record<string, string> = {
  "11-apex-pages": "Pages, SQL & Backend Foundations",
};

const BUTTONS_TITLES: Record<string, string> = {
  "part1-layouts-static": "Part 1 — Layouts & Static Pages",
  "part2-home-products": "Part 2 — Home & Products",
  "part3-shops-cart-checkout": "Part 3 — Shops, Cart & Checkout",
  "part4-orders-account-wishlist": "Part 4 — Orders, Account & Wishlist",
  "part5-auth": "Part 5 — Auth Views",
  "part6-trader": "Part 6 — Trader Views",
  "part7-emails": "Part 7 — Email Templates",
  "part8-profile-components": "Part 8 — Profile & Components",
};

function readSafe(filePath: string): string {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return "";
  }
}

export function getAllDocs(): DocSection[] {
  const docs: DocSection[] = [];

  // Main docs (root of /docs/)
  for (const slug of Object.keys(MAIN_TITLES)) {
    const filePath = path.join(DOCS_ROOT, `${slug}.md`);
    if (fs.existsSync(filePath)) {
      docs.push({
        title: MAIN_TITLES[slug],
        slug,
        group: "main",
        filePath,
      });
    }
  }

  // Oracle APEX docs (still files at the root of /docs/, just grouped separately
  // in the UI so the Laravel-side reader doesn't have to scroll past them).
  for (const slug of Object.keys(APEX_TITLES)) {
    const filePath = path.join(DOCS_ROOT, `${slug}.md`);
    if (fs.existsSync(filePath)) {
      docs.push({
        title: APEX_TITLES[slug],
        slug,
        group: "apex",
        filePath,
      });
    }
  }

  // Buttons sub-folder
  for (const slug of Object.keys(BUTTONS_TITLES)) {
    const filePath = path.join(DOCS_ROOT, "buttons", `${slug}.md`);
    if (fs.existsSync(filePath)) {
      docs.push({
        title: BUTTONS_TITLES[slug],
        slug,
        group: "buttons",
        filePath,
      });
    }
  }

  return docs;
}

export function getDoc(group: "main" | "buttons" | "apex", slug: string): { title: string; markdown: string } | null {
  if (group === "main") {
    const title = MAIN_TITLES[slug];
    if (!title) return null;
    const filePath = path.join(DOCS_ROOT, `${slug}.md`);
    return { title, markdown: readSafe(filePath) };
  }
  if (group === "apex") {
    const title = APEX_TITLES[slug];
    if (!title) return null;
    const filePath = path.join(DOCS_ROOT, `${slug}.md`);
    return { title, markdown: readSafe(filePath) };
  }
  const title = BUTTONS_TITLES[slug];
  if (!title) return null;
  const filePath = path.join(DOCS_ROOT, "buttons", `${slug}.md`);
  return { title, markdown: readSafe(filePath) };
}

export function getReadme(): string {
  return readSafe(path.join(DOCS_ROOT, "README.md"));
}
