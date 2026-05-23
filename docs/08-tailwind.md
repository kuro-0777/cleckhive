# 08 — Styling (SCSS, not Tailwind)

> ⚠️ **CleckHive uses plain SCSS modules — there is no Tailwind in the
> React app.** Every page has a sibling `.scss` file that's imported at
> the top of the component (e.g. `ProductPage.jsx` ↔ `ProductPage.scss`).

(This docs site itself uses Tailwind. The CleckHive frontend does not.)

## How styles are organised

```
resources/js/
├── pages/customer/CategoryPage.jsx
├── pages/customer/CategoryPage.scss      ← imported by the .jsx
├── components/Navbar.jsx
└── components/Navbar.scss
```

Each component imports its own SCSS:

```jsx
import './ProductPage.scss'
```

## Conventions

- **BEM-ish** class names: `cart-card`, `cart-card-info`, `cart-card-actions`.
- **Nesting** via SCSS for hover states / modifiers (`&:hover`, `&.is-active`).
- **Variables** are inline per-file (no shared `_variables.scss`) — colour palette tends to live at the top of each file.
- **Icons** come from `lucide-react`, not a font-icon set.

## Deprecation watch

Vite still emits a Sass deprecation warning for one call:

```
resources\js\pages\customer\CategoryPage.scss 118:27
  darken() is deprecated. Use color.adjust(...) instead.
```

Harmless until Dart Sass 3.0. Fix when convenient:

```scss
&:hover { background: color.adjust(#f5f5f5, $lightness: -3%); }
```

(Add `@use 'sass:color';` at the top of the file.)

## Build

```bash
npm run build      # vite build (with NODE_OPTIONS=--max-old-space-size=4096)
npm run dev        # vite dev server (HMR)
```

Build outputs to `public/build/` and Laravel serves them through
`@vite('resources/js/app.jsx')` in the Blade shell.
