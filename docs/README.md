# CleckHive — Team 16 Project Documentation

CleckHive is a Laravel + React marketplace backed by Oracle XE and an
Oracle APEX admin app. This docs site indexes everything: schema,
controllers, routes, button mappings, and the APEX configuration.

## Quick start

```bash
# Laravel + React
cd TeamProject
composer install
npm install
cp .env.example .env
php artisan key:generate
php artisan migrate:fresh --seed     # creates tables, triggers, sequences, custom_auth, set_user_session
npm run dev                          # vite dev server
php artisan serve                    # PHP server (port 8000)

# APEX (one time)
# Import Cleckhiveapp.sql against the TEAM16 workspace.
# Confirm custom_auth + set_user_session exist (migration creates them).
```

Seeded admin: `admin@cleckhive.test` / `admin123`.

## Conventions

- Roles are PascalCase in DB (`Admin`, `Trader`, `Customer`) — CHECK enforced.
- Passwords are stored **plaintext** (shared with APEX `custom_auth`).
- IDs are VARCHAR2(10) with table-specific prefixes (`U`, `S`, `P`, …).
- Order ownership is via `PAYMENT_TABLE.user_id` (ORDER_TABLE has no user_id).

See sidebar for everything else.
