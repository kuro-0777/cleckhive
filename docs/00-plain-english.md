# 00 — Plain English (Start Here If You Don't Code)

## What is CleckHive?

CleckHive is a small online marketplace for local traders (a butcher, a greengrocer, a fishmonger) in the fictional town of Cleckhive. Customers browse products, add them to a cart, pick a collection slot at the town market, and pay. Traders manage their own shop and stock; the admin oversees everyone.

## How it's put together

Three pieces talk to one Oracle database:

1. **React** — what customers and traders see in their browser.
2. **Laravel (PHP)** — the API behind the React UI. Validates, authorises, then writes to Oracle.
3. **Oracle APEX** — a low-code admin app the site admin uses to inspect and edit data directly.

All three save data into the **same** Oracle database (`TEAM16` schema). They share tables like `USER_TABLE`, `PRODUCT_TABLE`, `ORDER_TABLE`, etc.

## Who can do what

| Role     | What they can do                                                       |
|----------|------------------------------------------------------------------------|
| Customer | Browse, favourite, add-to-cart, checkout, pay, review                  |
| Trader   | Create/edit/delete their own products, set discounts, see their sales  |
| Admin    | Manage traders, customers, categories, collection slots, view reports  |

## Where the files live

```
Team16Project/
├── TeamProject/             ← Laravel + React app
│   ├── app/                  PHP backend (controllers, models, middleware)
│   ├── database/             migrations, seeders, images for seeding
│   ├── resources/js/         React frontend
│   └── routes/api.php        the URL map for the API
├── Cleckhiveapp.sql          Oracle APEX admin app (importable)
└── ExportedDatabaseTables.sql  database schema + triggers + sequences
```

## What to read next

- Curious about the tech? → `01 — Overview & Laravel Primer`
- Want to know what data lives where? → `02 — Database`
- Want to know which button does what? → the **Button Reference** in the sidebar
