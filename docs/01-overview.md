# 01 — Overview & Laravel Primer

## Stack at a glance

| Layer        | Tech                                                                    |
|--------------|-------------------------------------------------------------------------|
| Frontend     | React 18, React Router, Vite, SCSS, lucide-react icons                  |
| Backend API  | Laravel 11, Sanctum tokens, `yajra/laravel-oci8` Oracle driver          |
| Database     | Oracle XE 21c (`XEPDB1`, schema `TEAM16`)                               |
| Admin app    | Oracle APEX 26 (imported from `Cleckhiveapp.sql`)                       |
| ORDS         | Oracle REST Data Services — exposes some tables to the React frontend   |
| Payments     | PayPal sandbox (server-side capture)                                    |

## Project layout

```
TeamProject/
├── app/
│   ├── Http/
│   │   ├── Controllers/   ← endpoint logic (Auth, Cart, Order, …)
│   │   └── Middleware/    ← EnsureRole (customer/trader/admin gate)
│   └── Models/            ← Eloquent models, 1:1 with Oracle tables
├── bootstrap/
├── config/database.php    ← `oracle` connection (XEPDB1 / TEAM16)
├── database/
│   ├── migrations/        ← creates tables, sequences, triggers, custom_auth
│   └── seeders/           ← Users, Categories, Shops, Products, Orders, …
├── public/                ← Vite-built JS/CSS lands here
├── resources/
│   ├── js/
│   │   ├── api/           ← axios + ORDS clients (`axios.js`, `ords.js`)
│   │   ├── components/    ← Navbar, Footer, ToastProvider, …
│   │   ├── pages/         ← admin/, customer/, trader/ pages
│   │   └── utils/         ← cart, discountLogic helpers
│   └── views/             ← single-page Blade host
├── routes/
│   ├── api.php            ← /api/* routes (the main URL map)
│   └── web.php            ← serves the SPA shell
└── vite.config.js
```

## Request lifecycle (React → Laravel → Oracle)

1. Browser hits `https://app/api/products` via `resources/js/api/axios.js`.
2. Laravel's router (`routes/api.php`) matches → `ProductController@index`.
3. Controller queries `Product` model (Eloquent) → yajra oci8 → Oracle.
4. JSON response → React → re-render.

## Request lifecycle (React → ORDS direct)

Some pages bypass Laravel and call ORDS straight from the browser
(`resources/js/api/ords.js`, baseURL `http://localhost:8080/ords/teamproject/`).
This is faster but skips Laravel's auth and validation — used for
list/read-only screens where the data isn't sensitive.

## Auth in one diagram

```
React  ──/api/oracle-login──▶  Laravel (AuthController)
                                  │
                                  ├─ updateOrCreate USER_TABLE row
                                  ├─ subtype row (CUSTOMER / TRADER)
                                  └─ returns Sanctum token
React stores token → adds `Authorization: Bearer …` to subsequent /api/ calls
```

For the **APEX admin app** the same `USER_TABLE` is used, but via the
`custom_auth` PL/SQL function (plaintext password check — that's why the
Laravel side now stores plaintext too). See `06 — Middleware & Auth`.

## Where to look next

- `02 — Database`            — the schema in detail
- `04 — Routes`              — every `/api/*` endpoint
- `11 — Oracle APEX Backend` — the APEX admin app
