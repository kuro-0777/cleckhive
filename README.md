# Team 16 — CleckHive Docs Site

A Next.js 14 docs site that renders the markdown documentation from `./docs/` with a dark theme, shadcn-style components, Tailwind CSS, and a navigable sidebar.

## Setup

```bash
cd docs-site
npm install
npm run dev
```

Open <http://localhost:3000>.

## Build for production

```bash
npm run build
npm run start
```

## How it works

- All markdown files in `../frontend/docs/*.md` and `../frontend/docs/buttons/*.md` are read at build time by `lib/docs.ts`.
- Routes:
  - `/` → home dashboard with quick-jump cards.
  - `/doc/[slug]` → any main doc (e.g. `/doc/02-database`).
  - `/buttons/[slug]` → any button-reference part (e.g. `/buttons/part2-home-products`).
- Markdown is rendered by `react-markdown` with:
  - `remark-gfm` for GitHub tables, task lists, strikethrough.
  - `rehype-highlight` for code syntax highlighting (GitHub Dark theme).
  - `rehype-slug` + `rehype-autolink-headings` for anchored headings.
- Styling: Tailwind CSS + `@tailwindcss/typography` (`prose-invert`) with custom overrides in `app/globals.css` to match the dark shadcn palette.

## Adding new docs

1. Drop a new `.md` file into `../frontend/docs/` or `../frontend/docs/buttons/`.
2. Edit `lib/docs.ts` and add the slug → title mapping in `MAIN_TITLES` or `BUTTONS_TITLES`.
3. Restart dev server (or rebuild). The sidebar updates automatically.

## File map

```
docs-site/
├── app/
│   ├── layout.tsx              ← global layout (sidebar + content)
│   ├── globals.css             ← Tailwind + dark theme + prose overrides
│   ├── page.tsx                ← home dashboard
│   ├── not-found.tsx
│   ├── doc/[slug]/page.tsx     ← renders any main doc
│   └── buttons/[slug]/page.tsx ← renders any buttons doc
├── components/
│   ├── sidebar.tsx             ← left nav with grouped doc links
│   ├── markdown-view.tsx       ← markdown renderer
│   └── ui/card.tsx             ← shadcn-style card
├── lib/
│   ├── docs.ts                 ← reads markdown from ../frontend/docs/
│   └── utils.ts                ← cn() helper
├── tailwind.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── next.config.mjs
└── package.json
```

## Stack

- **Next.js 14** (App Router)
- **React 18**
- **TypeScript**
- **Tailwind CSS 3.4** + `@tailwindcss/typography`
- **react-markdown** + remark/rehype plugins
- **highlight.js** (GitHub Dark theme)
- **lucide-react** for icons
- shadcn-style design (dark zinc palette + green accent matching the Laravel app)

No external services, no database, no auth — purely static-friendly. Can be deployed to Vercel, Netlify, or `next build && next start` on any Node host.
