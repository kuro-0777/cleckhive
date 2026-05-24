# 13 — Viva / Examiner Walkthrough (Team 16 — CleckHive)

Point-by-point answers tailored to **Team 16's CleckHive project**. All file paths are relative to the project root `TeamProject/` (the Laravel API + React app). The APEX export is `Cleckhiveapp.sql` in the parent folder.

This project uses a **different architecture from Team 6**: Laravel acts as a JSON API consumed by a React SPA (Vite + Sanctum tokens). Cart, slot, stock and discount rules are pushed into the **Oracle database itself** via triggers, so the DB is the source of truth.

---

## 1. Authentication

### How it works (Laravel side)
- **Library**: Laravel Sanctum (token-based, not session-based).
- **Endpoint**: `POST /api/oracle-login` → `AuthController::login()`.
- **Code**: `TeamProject/app/Http/Controllers/AuthController.php`.
- **Token issuance**: `$user->createToken('auth_token')->plainTextToken` (Sanctum personal access token). Tokens land in `personal_access_tokens` table.
- **Storage**: passwords are stored as **plaintext** in `user_table.password`. This is deliberate — the APEX admin app calls `custom_auth(p_username, p_password)` which does `Password = TRIM(p_password)`. Hashing would lock APEX out.
- **Protected routes**: every authenticated route is in a `Route::middleware('auth:sanctum')->group(...)` block in `TeamProject/routes/api.php`.

```php
// AuthController::login excerpt
$user = User::updateOrCreate(
    ['email' => $request->email],
    ['name' => $request->name, 'role' => $role,
     'password' => $request->password ?? Str::random(32), ...]
);
$user->tokens()->delete();
$token = $user->createToken('auth_token')->plainTextToken;
```

### Authentication for App Builder (APEX)
- Defined in `Cleckhiveapp.sql` around line 24050.
- Scheme name: **`Custom Auth`** (`p_scheme_type => NATIVE_CUSTOM`).
- Calls the PL/SQL function `custom_auth(p_username, p_password) RETURN BOOLEAN`.
- The function lives in the database, created by migration `TeamProject/database/migrations/2026_05_21_000100_create_oracle_sequences_and_triggers.php` (lines ~67–82):
  ```sql
  CREATE OR REPLACE FUNCTION custom_auth (
      p_username IN VARCHAR2, p_password IN VARCHAR2
  ) RETURN BOOLEAN AS
      l_user_exists NUMBER := 0;
  BEGIN
      SELECT COUNT(*) INTO l_user_exists
      FROM   User_Table
      WHERE  LOWER(TRIM(Email)) = LOWER(TRIM(p_username))
        AND  Password = TRIM(p_password);
      RETURN l_user_exists > 0;
  EXCEPTION WHEN OTHERS THEN RETURN FALSE;
  END;
  ```
- The active scheme is referenced by `p_authentication_id=>wwv_flow_imp.id(426609161023196310)` at line 97 of `Cleckhiveapp.sql`.
- After login, a stored procedure `set_user_session` is called (created by the same migration) — it pulls `Role` + `User_id` from `User_Table` and writes them into APEX session items `:APP_USER_ROLE` and `:APP_USER_ID`, so authorization schemes can read them.

---

## 2. Authorization

### Difference vs Authentication
| | Authentication | Authorization |
|--|--|--|
| Question | "Who are you?" | "What may you do?" |
| Laravel | Sanctum token in `Authorization: Bearer …` header | `auth:sanctum` middleware + role checks in controllers |
| APEX | `custom_auth` function | Security schemes attached to pages/regions |

### Laravel side
Role checks happen inside controllers via `$request->user()->role`. There is **no role-specific middleware** — `auth:sanctum` is the only gate, and admin/trader-only routes typically verify role in the controller body.

### APEX authorization schemes (`Cleckhiveapp.sql` lines ~23250–23410)
Six schemes are defined:

| Scheme | Static ID | Type | Logic |
|--------|-----------|------|-------|
| `Admin` | `admin` | `NATIVE_EXISTS` | `SELECT 1 FROM user_table WHERE UPPER(email)=UPPER(:APP_USER) AND role='Admin'` |
| `ADMIN_OR_TRADER` | `admin-or-trader` | `NATIVE_FUNCTION_BODY` | returns `v_role IN ('Admin','Trader')` |
| `Administration Rights` | `administration-rights` | `NATIVE_FUNCTION_BODY` | `return true;` |
| `CUSTOMER_OR_ADMIN` | `customer-or-admin` | `NATIVE_FUNCTION_BODY` | returns `v_role IN ('Customer','Admin')` |
| `IS_ADMIN` | `is-admin` | `NATIVE_FUNCTION_BODY` | returns `v_role = 'Admin'` |
| `IS_TRADER` | `is-trader` | `NATIVE_FUNCTION_BODY` | returns `v_role = 'Trader'` |

### Where do we assign the authorization scheme in App Builder?
In the APEX page designer: select the page → property panel → **Security → Authorization Scheme** → pick one of the names above. Same idea for regions, buttons, and items.

### How multiple users access the same page
APEX gives each browser its own `:APP_SESSION` ID on login. `:APP_USER` holds the email, `:APP_USER_ROLE` and `:APP_USER_ID` are populated by `set_user_session`. Every region query filters by these bind variables, so each authenticated user sees only their own data.

### What is `v('APP_USER')`?
APEX built-in that returns the email of the currently logged-in user. Equivalent to `:APP_USER` inside SQL. Used at the top of the `set_user_session` procedure: `SELECT Role, User_id INTO v_role, v_user_id FROM User_Table WHERE LOWER(Email) = LOWER(v('APP_USER'))`.

---

## 3. Responsive design

The React frontend uses **Tailwind CSS 4** (see `TeamProject/package.json`) combined with per-page **SCSS** files that include `@media (min-width: $md)` queries.

Examples:
- `TeamProject/resources/js/pages/customer/Cart.scss` — `@media (min-width: $md)` controls layout switching at the medium breakpoint.
- Every page component has a matching `.scss` next to its `.jsx`.
- Tailwind utilities (`md:`, `lg:`) are also used inside JSX `className=""` attributes.

---

## 4. Trader / Admin dashboards

### Trader (Laravel)
- Code: `TeamProject/app/Http/Controllers/TraderController.php`.
- React UI: `TeamProject/resources/js/pages/trader/TraderDashboard.jsx`.
- API exposes today's orders, total products, today's revenue. Filtered by trader's `user_id`.

### Admin (Laravel)
- Code: `TeamProject/app/Http/Controllers/AdminController.php`.
- React UI: `TeamProject/resources/js/pages/admin/AdminDashboard.jsx`.
- `stats()` returns: `$totalCustomers = User::where('role','customer')->count();` etc.

### APEX dashboards
- Pages declared in `Cleckhiveapp.sql`. The admin overview shows totals, recent orders, and a sales chart per week.

---

## 5. Database connection

- **Driver**: Oracle, via `yajra/laravel-oci8`.
- **Config file**: `TeamProject/config/database.php`.
- **Credentials**: `TeamProject/.env`:
  ```env
  DB_CONNECTION=oracle
  DB_HOST=localhost
  DB_PORT=1522
  DB_DATABASE=XEPDB1
  DB_SERVICE_NAME=XEPDB1
  DB_USERNAME=team16
  DB_PASSWORD=Team16Pass
  DB_SCHEMA=team16
  ```
- **Schema count**: one application schema (`TEAM16` inside the pluggable database `XEPDB1`).

### Where is OCI connected? `oci_parse`?
Laravel never calls `oci_connect` / `oci_parse` directly. The `yajra/laravel-oci8` package's `OracleConnector` wraps `oci_pconnect`, and the Eloquent query builder converts each query into a prepared statement under the hood — `oci_parse → oci_bind → oci_execute`. Auto-discovered through `composer.json` → no manual provider registration.

---

## 6. Number of tables

**16 application tables** (plus 5 Laravel infrastructure tables). Migrations live in `TeamProject/database/migrations/`:

| # | Table | Migration |
|---|-------|-----------|
| 1 | `user_table` | `…_create_user_table.php` |
| 2 | `customer_table` | `…_create_customer_table.php` |
| 3 | `shop_table` | `…_create_shop_table.php` |
| 4 | `trader_table` | `…_create_trader_table.php` |
| 5 | `category_table` | `…_create_category_table.php` |
| 6 | `discount_table` | `…_create_discount_table.php` |
| 7 | `product_table` | `…_create_product_table.php` |
| 8 | `collection_slot` | `…_create_collection_slot.php` |
| 9 | `order_table` | `…_create_order_table.php` |
| 10 | `product_order` | `…_create_product_order.php` |
| 11 | `payment_table` | `…_create_payment_table.php` |
| 12 | `cart_table` | `…_create_cart_table.php` |
| 13 | `product_cart` | `…_create_product_cart.php` |
| 14 | `favorite_table` | `…_create_favorite_table.php` |
| 15 | `product_favorite` | `…_create_product_favorite.php` |
| 16 | `review_table` | `…_create_review_table.php` |
| (+1) | `contact_messages` | `…_create_contact_messages_table.php` |

Plus Laravel infrastructure: `personal_access_tokens` (Sanctum), `sessions`, `cache`, `jobs`, `password_reset_tokens`.

---

## 7. Number of triggers

> *A trigger is a special stored procedure that automatically executes a set of SQL statements when an INSERT, UPDATE or DELETE event happens on a table. Used to enforce integrity, maintain consistency, and automate tasks.*

The single migration `TeamProject/database/migrations/2026_05_21_000100_create_oracle_sequences_and_triggers.php` creates:

- **14 ID-generation triggers** (one per business table) — each fires `BEFORE INSERT`, fills `Xxxx_id` from a sequence with a prefix (e.g. `'U' || TO_CHAR(seq.NEXTVAL,'FM00000')` → `U00101`).
- **9 business-rule triggers**:
  - `trig_check_slot_capacity` — 24-hour rule + slot capacity check + increments `Booked_Count`.
  - `trig_cart_limit` — 20-item cart cap (raises `-20001`).
  - `trig_cart_delete` — decrements `Item_Count` on remove.
  - `trig_payment_update_order` — flips order to `'Paid'` when payment completes.
  - `trig_discount_expiry` — auto-deactivates expired discounts.
  - `trig_product_availability` — flips `Is_Available` from `Stock_Qantity`.
  - `trig_product_order_stock` — validates stock + max-order, decrements stock, fills `Sub_Total`.
  - `trig_apply_discount_to_products` — links a new discount to all of the trader's products.
  - `trig_clear_discount_before_delete` — cleans the FK before discount delete.
- **4 `updated_at` triggers** (User, Shop, Review, Slot tables).
- Plus 17 supporting **sequences** (`User_Table_seq`, `Customer_Table_seq`, … `Product_Favorite_seq`).

**Grand total: ~27 triggers + 17 sequences + 1 function (`custom_auth`) + 1 procedure (`set_user_session`).**

### Show + explain one trigger — the 24-hour rule

This is the most viva-friendly one because it answers two questions at once (triggers + collection-slot 24-hour rule).

```sql
CREATE OR REPLACE TRIGGER trig_check_slot_capacity
BEFORE INSERT ON Order_Table
FOR EACH ROW
DECLARE
    v_booked    NUMBER;
    v_capacity  NUMBER;
    v_slot_date DATE;
BEGIN
    SELECT TO_NUMBER(Capacity), Booked_Count, Slot_Date
    INTO   v_capacity, v_booked, v_slot_date
    FROM   Collection_Slot
    WHERE  Collection_Slot_id = :NEW.Collection_Slot_id;

    IF v_slot_date < SYSDATE + 1 THEN
        RAISE_APPLICATION_ERROR(-20012,
            'Collection slot must be booked at least 24 hours in advance.');
    END IF;
    IF v_booked >= v_capacity THEN
        RAISE_APPLICATION_ERROR(-20001,
            'This collection slot is fully booked. Please choose a different slot.');
    END IF;

    UPDATE Collection_Slot
       SET Booked_Count = Booked_Count + 1, Updated_at = SYSDATE
     WHERE Collection_Slot_id = :NEW.Collection_Slot_id;
END;
```

**Explain**: BEFORE INSERT on `Order_Table` for each row; reads the chosen slot; rejects the order with ORA-20012 if `slot_date < sysdate+1` (less than 24 h away), or ORA-20001 if it's full; otherwise increments the slot's booked counter.

---

## 8. Cart validation (≤ 20 items)

**Two-layer enforcement**:

### Layer 1 — Laravel controller
File: `TeamProject/app/Http/Controllers/CartController.php`. The check sits in the `add` method (line ~73):
```php
if ($cart->item_count + 1 > $cart->max_item) {
    return response()->json(
        ['success' => false, 'message' => "Cart cannot have more than {$cart->max_item} items."],
        422
    );
}
```
Default `max_item` is 50 on the row (set in `getOrCreateCart`), but the trigger overrides it to a hard 20.

### Layer 2 — Database trigger
The real cap is enforced by `trig_cart_limit` (in the triggers migration, lines ~205–223):
```sql
CREATE OR REPLACE TRIGGER trig_cart_limit
BEFORE INSERT ON Product_Cart
FOR EACH ROW
DECLARE v_count NUMBER;
BEGIN
    SELECT NVL(Item_Count, 0) INTO v_count FROM Cart_Table
    WHERE Cart_id = :NEW.Cart_id FOR UPDATE;

    IF v_count + 1 > 20 THEN
        RAISE_APPLICATION_ERROR(-20001, 'Cart cannot have more than 20 products');
    END IF;

    UPDATE Cart_Table SET Item_Count = v_count + 1 WHERE Cart_id = :NEW.Cart_id;
END;
```

So even if a developer bypasses the API and inserts directly, the DB rejects the 21st row.

---

## 9. Collection slot — 24-hour rule

Enforced **three** times for defence in depth:

| Layer | Where |
|-------|-------|
| Browser JS | React date picker on `Cart.jsx` / checkout pages disables past dates |
| API controller | `TeamProject/app/Http/Controllers/CollectionSlotController.php` — `reserve()` calls `$slot->hasEnoughLeadTime()` |
| DB trigger | `trig_check_slot_capacity` raises ORA-20012 if `Slot_Date < SYSDATE + 1` |

The controller method (lines ~53–75):
```php
$slot = CollectionSlot::lockForUpdate()->findOrFail($id);
if ($slot->isFull()) {
    return ['error' => 'Slot full', 'status' => 422];
}
if (!in_array($slot->day_of_week, $this->allowedDays, true)) {
    return ['error' => 'Only Wed/Thu/Fri', 'status' => 422];
}
if (!$slot->hasEnoughLeadTime()) {
    return ['error' => 'Slot must be booked at least 24 hours in advance.', 'status' => 422];
}
$slot->increment('current_order_count');
```

`$allowedDays = ['Wednesday','Thursday','Friday']` is also a Laravel-side rule (line 11).

---

## 10. Password encryption

**None applied** — passwords stored as plain text in `user_table.password` so the APEX `custom_auth` function (which does `WHERE Password = TRIM(p_password)`) can verify them. Acknowledged trade-off for APEX/Laravel parity. The trade-off is documented in the comment block on line 40 of `AuthController.php`.

For production, both sides would move to bcrypt + a PL/SQL bcrypt verifier in `custom_auth`.

---

## 11. PHP user-defined functions

| File | Function | Purpose |
|------|----------|---------|
| `app/Http/Controllers/AuthController.php` | `normalizeRole($role)` | Coerces "admin"/"trader"/"customer" → PascalCase to match Oracle CHECK constraint. |
| `app/Http/Controllers/AuthController.php` | `login`, `logout`, `me`, `updateMe` | Sanctum login + token issuance + profile fetch. |
| `app/Http/Controllers/CartController.php` | `getOrCreateCart($userId)` | Idempotent helper — returns this user's cart or creates one with `item_count=0, max_item=50`. |
| `app/Http/Controllers/CollectionSlotController.php` | `index`, `available`, `reserve` | Slot listing, future-only listing, atomic reservation with row lock. |
| `app/Models/CollectionSlot.php` | `booted()` static creator | Generates `'CS' || padded sequence value` as PK if not supplied. |
| `app/Models/CollectionSlot.php` | `capacityInt()` | Coerces VARCHAR `Capacity` column to int. |
| `app/Models/CollectionSlot.php` | `isFull()`, `hasEnoughLeadTime()` | Slot business rules (called by controller). |

---

## 12. Database functions

| Function | Created by | Purpose |
|----------|-----------|---------|
| `custom_auth(p_username, p_password)` | `2026_05_21_000100_create_oracle_sequences_and_triggers.php` lines 67–82 | APEX login. Plain-text password compare against `User_Table`. |
| `set_user_session` (procedure) | Same migration, lines 88–106 | Post-login: writes `:APP_USER_ROLE` + `:APP_USER_ID` from `User_Table` into APEX session items. |

To list them at runtime:
```sql
SELECT object_name, object_type FROM user_objects
WHERE object_type IN ('FUNCTION','PROCEDURE');
```

---

## 13. App User after login (`v('APP_USER')`)

After APEX login, `:APP_USER` = the email. `set_user_session` then runs:
```sql
SELECT Role, User_id INTO v_role, v_user_id
FROM   User_Table
WHERE  LOWER(Email) = LOWER(v('APP_USER'));

APEX_UTIL.SET_SESSION_STATE('APP_USER_ROLE', v_role);
APEX_UTIL.SET_SESSION_STATE('APP_USER_ID',   v_user_id);
```
After this, every authorization scheme can branch on `:APP_USER_ROLE`.

---

## 14. Which page is seen by whom

### Laravel (React frontend)
| Path | Role |
|------|------|
| `/`, `/products`, `/shop/{id}`, `/about`, `/contact` | Public |
| `/cart`, `/checkout`, `/invoice/{id}`, `/profile` | Customer (auth:sanctum + role check) |
| `/trader/*` | Trader |
| `/admin/*` | Admin |

API enforcement: `Route::middleware('auth:sanctum')->group(...)` in `routes/api.php` plus per-controller role checks.

### APEX (`Cleckhiveapp.sql`)
Admin-management pages are protected by `Admin` or `IS_ADMIN` schemes; trader pages by `IS_TRADER` or `ADMIN_OR_TRADER`; reports allowed to `CUSTOMER_OR_ADMIN` or wider.

---

## 15. Graphs / charts — logic and SQL

- **Where**: APEX admin pages render bar/line charts (region type "Chart") from SQL `GROUP BY` queries.
- **Underlying query shape** (Cleckhiveapp.sql admin sales chart):
  ```sql
  SELECT TO_CHAR(O.Order_Date, 'IW') AS WEEK_NO,
         SUM(O.Total_Amount) AS REVENUE
  FROM   Order_Table O
  WHERE  O.Status = 'Paid'
  GROUP  BY TO_CHAR(O.Order_Date, 'IW')
  ORDER  BY 1;
  ```
- Laravel-side mirror lives in `AdminController::stats()` and `AdminController::report()` — sums by date range.

---

## 16. Master-detail page

A master-detail page is one with two linked regions: pick a row in the **master** (parent) region, and the **detail** (child) region re-queries scoped to that selection.

### In APEX
Admin Manage Orders (`Cleckhiveapp.sql`) is the clearest example: master = `Order_Table` list, detail = `Product_Order` lines for the selected order.

### How to create one
In APEX App Builder → **Create Page → Master Detail → Stacked or Side-by-side**. Select the parent table (e.g. `Order_Table`) and the child table with the FK (e.g. `Product_Order.Order_id`). APEX scaffolds both regions automatically.

---

## 17. Frontend ↔ backend connection

```
React (Vite) ── axios fetch ──► Laravel API ── yajra/oci8 ──► Oracle XEPDB1
                  (Bearer token)        (Eloquent)          (TCP 1522)
```

- React app entry: `TeamProject/resources/js/main.jsx`.
- Axios base URL is configured in `TeamProject/resources/js/api/`.
- Sanctum token is stored in `localStorage` by `resources/context/AuthContext.jsx`, attached to every request as `Authorization: Bearer <token>`.
- APEX runs in the same DB but is served by ORDS on a different HTTP port; APEX traffic doesn't touch Laravel.

---

## 18. Tokens

**Sanctum personal-access tokens.** Created at `AuthController::login`:
```php
$user->tokens()->delete();                                        // wipe old
$token = $user->createToken('auth_token')->plainTextToken;        // mint new
```
Stored in `personal_access_tokens` table (migration `2026_04_28_130401`). Sent on each request as a Bearer header. Sanctum middleware looks up the hash, attaches the `User` model to `$request`.

CSRF tokens also exist for browser session routes (`web.php`), but the React app talks to `routes/api.php` exclusively, so Sanctum tokens are the relevant ones.

---

## 19. Admin dashboard code

- API: `TeamProject/app/Http/Controllers/AdminController.php` (≈ 200 lines: `stats`, `users`, `pendingTraders`, `approveTrader`, `rejectTrader`, `manageOrders`, etc.).
- React UI: `TeamProject/resources/js/pages/admin/AdminDashboard.jsx`.
- APEX twin: admin pages declared inside `Cleckhiveapp.sql`.

Example query (`AdminController::stats`):
```php
$totalCustomers = User::where('role', 'customer')->count();
$totalTraders   = User::where('role', 'trader')->count();
```

---

## 20. Customer ID / Order ID in trader's daily report

The trader's order list filters joined tables by `User_id` (the logged-in trader). API code lives in `TraderController.php`; APEX twin uses an SQL region:
```sql
SELECT  O.Order_id,
        C.Customer_id,
        U.Name        AS Customer,
        PO.Quantity,
        PO.Unit_Price,
        O.Order_Date
FROM    Order_Table O
JOIN    Product_Order PO ON PO.Order_id    = O.Order_id
JOIN    Customer_Table C ON C.Customer_id  = O.Customer_id
JOIN    User_Table U     ON U.User_id      = C.User_id
WHERE   PO.Product_id IN (SELECT Product_id FROM Product_Table
                          WHERE Shop_id = (SELECT Shop_id FROM Shop_Table
                                            WHERE User_id = :APP_USER_ID))
  AND   TRUNC(O.Order_Date) = TRUNC(SYSDATE);
```

---

## 21. How was Trader ID (User_id, etc.) created?

Every ID column gets its value from a **BEFORE INSERT** trigger that reads from a sequence and prepends a prefix. Example (User table):
```sql
CREATE OR REPLACE TRIGGER trig_user_table
BEFORE INSERT ON User_Table
FOR EACH ROW
BEGIN
    IF :NEW.User_id IS NULL THEN
       :NEW.User_id := 'U' || TO_CHAR(User_Table_seq.NEXTVAL, 'FM00000');
    END IF;
    IF :NEW.Created_at IS NULL THEN
       :NEW.Created_at := SYSDATE;
    END IF;
END;
```
Produces strings like `U00101`, `U00111`, … (sequence starts at 101, increments by 10). Each of the 14 tables follows the same pattern with its own prefix (`S` shop, `C` category, `P` product, `OR` order, `PAY` payment, etc.).

This whole block is in the triggers migration, function `idTriggers()` (lines 133–171).

---

## 22. Invoice — how does customer name/address change?

- React component: `TeamProject/resources/js/pages/customer/Invoice.jsx`.
- Customer name and address are pulled from the React `user` context object (which originates from the `/api/me` endpoint, which in turn queries `User_Table`):
  ```jsx
  const customerName  = user?.name    || 'Customer'
  const customerAddr  = user?.address || 'Kathmandu, Nepal'
  const customerPhone = user?.phone_number || '—'
  ```
- The invoice reads **live data** — there is no snapshot. If the customer edits their profile (via `AuthController::updateMe`), the next invoice render reflects the new values.

---

## 23. SQL of graph/chart

Covered in §15 — admin sales chart uses `TO_CHAR(Order_Date,'IW')` to bucket by ISO week.

---

## 24. Validation — where in the code?

Three places:

### 1. Browser
Standard HTML attributes (`required`, `type="email"`, `min`, `max`) inside the React JSX, plus inline React state checks.

### 2. Laravel controllers — `$request->validate(...)`
Every state-changing API call validates. Examples:
- `AuthController::login` lines 28–32 — email/name/role required.
- `AuthController::updateMe` lines 89–94 — name, phone, dob, address.
- `AdminController::createTrader` line ~63 — `email` required + unique:users,email.

### 3. Database
- Oracle CHECK constraints on `Role` (must be `'Admin'/'Trader'/'Customer'`), `Verified` (must be `'YES'/'NO'/'PENDING'`).
- UNIQUE on `User_Table.Email`.
- NOT NULL on most business columns.
- Business-rule triggers (slot 24h, cart 20-item, stock decrement) — these are also validation, just at DB level.

---

## 25. How do we avoid duplicate emails?

Three layers:

1. **Database**: `UNIQUE` index on `User_Table.Email` (migration). The ultimate guard — even concurrent inserts hit ORA-00001.
2. **Laravel validation**: `'email' => 'required|email|unique:users,email'` in `AdminController::createTrader` line ~63.
3. **Login flow**: `User::updateOrCreate(['email' => $request->email], ...)` in `AuthController::login` — the email is the natural key, so existing rows are updated instead of duplicated.

---

## 26. Trigger definition (refresher)

> *A trigger is a special type of stored procedure that automatically executes when an INSERT/UPDATE/DELETE event happens on a table — used to enforce data integrity, maintain consistency, and automate tasks.*

This project leans heavily on triggers — they own ID generation, cart cap, slot 24-h rule, stock decrement, payment→order status flip, discount expiry, and `updated_at` maintenance. See §7 for the full inventory.

---

## 27. Authentication / authorization end-to-end

1. **React** posts email+password+role to `POST /api/oracle-login`.
2. `AuthController::login` validates, normalises the role, `updateOrCreate`s the user row (cascades to `customer_table` or `trader_table` if needed), and mints a Sanctum token.
3. React stores the token in `localStorage` (`AuthContext.jsx`) and attaches it to every subsequent request.
4. Sanctum middleware (`auth:sanctum` in `routes/api.php`) verifies the bearer token, attaches `User` to `$request`.
5. Controllers read `$request->user()->role` to gate admin/trader-only actions.

For **APEX** the parallel path is:
1. APEX login page POSTs to `Custom Auth` scheme.
2. `custom_auth(p_username, p_password)` returns `TRUE` if the row exists with matching plain-text password.
3. `set_user_session` populates `:APP_USER_ROLE` and `:APP_USER_ID`.
4. Each page's authorization scheme (Admin, IS_TRADER, ADMIN_OR_TRADER, …) reads `:APP_USER_ROLE`.

---

## 28. Different traders accessing the same APEX page

APEX issues each browser its own `:APP_SESSION` id at login. `:APP_USER`, `:APP_USER_ROLE` and `:APP_USER_ID` are all per-session. Every region in trader-facing pages includes the bind variable `:APP_USER_ID` in its `WHERE` clause, so two simultaneously-logged-in traders see only their own data — no application-side branching needed.

---

## 29. Frontend ↔ backend file path reference

| Concern | File |
|---------|------|
| **Laravel API** | |
| Authentication | `TeamProject/app/Http/Controllers/AuthController.php` |
| Route definitions | `TeamProject/routes/api.php` |
| Cart cap (PHP layer) | `TeamProject/app/Http/Controllers/CartController.php` |
| Cart cap (DB trigger) | `TeamProject/database/migrations/2026_05_21_000100_create_oracle_sequences_and_triggers.php` (trig_cart_limit) |
| Slot 24h rule (PHP) | `TeamProject/app/Http/Controllers/CollectionSlotController.php`, `app/Models/CollectionSlot.php` |
| Slot 24h rule (trigger) | Same migration (`trig_check_slot_capacity`) |
| Stock decrement trigger | Same migration (`trig_product_order_stock`) |
| `custom_auth` function | Same migration, lines 67–82 |
| `set_user_session` proc | Same migration, lines 88–106 |
| Sequence + PK trigger defs | Same migration, `idTriggers()` lines 133–171 |
| Database config | `TeamProject/config/database.php`, `TeamProject/.env` |
| Admin dashboard API | `TeamProject/app/Http/Controllers/AdminController.php` |
| Trader controller | `TeamProject/app/Http/Controllers/TraderController.php` |
| Payment controller | `TeamProject/app/Http/Controllers/PaymentController.php` |
| Order controller | `TeamProject/app/Http/Controllers/OrderController.php` |
| **React frontend** | |
| Auth context (token storage) | `TeamProject/resources/context/AuthContext.jsx` |
| Invoice component | `TeamProject/resources/js/pages/customer/Invoice.jsx` |
| Cart UI | `TeamProject/resources/js/pages/customer/Cart.jsx` |
| Admin dashboard UI | `TeamProject/resources/js/pages/admin/AdminDashboard.jsx` |
| Trader dashboard UI | `TeamProject/resources/js/pages/trader/TraderDashboard.jsx` |
| Tailwind/SCSS config | `TeamProject/package.json` (Tailwind v4), `*.scss` next to each page |
| **APEX** | |
| Whole app export | `Cleckhiveapp.sql` (project root) |
| Authentication scheme | `Cleckhiveapp.sql` line ~24050 (`Custom Auth` → `custom_auth`) |
| Authorization schemes | `Cleckhiveapp.sql` lines ~23250–23410 |
