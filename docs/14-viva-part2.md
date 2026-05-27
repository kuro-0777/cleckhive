# Viva Part 2 — Answers (verified against Team16Project codebase)

Project scanned: `C:\Users\kuro\Documents\Team16Project\TeamProject` (Laravel + Oracle + React/Vite + APEX).

> **Heads up:** The reference doc `13-viva-part2.md` was written for a *different* version of this project. Many file names it cites (`LoginRequest.php`, `EnsureUserIsTrader.php`, multiple Mail classes, `StockController.php`, `USER_AUTH` function) do **not** exist in this codebase. Answers below reflect the **actual** code on disk. Differences are flagged inline.

---

## 1. Validation

**Where:** Mix of FormRequest classes in `app/Http/Requests/` (e.g. `AddCartItemRequest.php`) and inline `$request->validate([...])` calls in controllers.

```php
// app/Http/Requests/AddCartItemRequest.php (≈ lines 12–16)
public function rules(): array {
    return [
        'product_id' => 'required|exists:products,product_id',
        'quantity'   => 'required|integer|min:1',
    ];
}

// app/Http/Controllers/AuthController.php (≈ lines 28–32)
$request->validate([
    'email' => 'required|email',
    'name'  => 'required|string',
    'role'  => 'required|string',
]);
```

Rules used across the project: `required`, `email`, `exists`, `unique`, `string`, `integer`, `numeric`, `min`, `max`, `date`, `array`. On failure Laravel returns 422 JSON (API) or redirects back with the `$errors` bag (Blade).

---

## 2. Authentication — PHP code

**File:** `app/Http/Controllers/AuthController.php` → `login()` (lines 26–74).

```php
public function login(Request $request) {
    $request->validate([
        'email' => 'required|email',
        'name'  => 'required|string',
        'role'  => 'required|string',
    ]);
    $role = $this->normalizeRole($request->role);

    $user = User::updateOrCreate(
        ['email' => $request->email],
        [
            'name'          => $request->name,
            'role'          => $role,
            'password'      => $request->password ?? Str::random(32), // PLAINTEXT (intentional)
            'phone_number'  => $request->phone_number ?? 0,
            'date_of_birth' => $request->date_of_birth ?? '1970-01-01',
        ]
    );

    if ($role === 'Customer' && !$user->customer()->exists()) {
        $user->customer()->create(['verified' => 'YES']);
    }
    // … similar for Trader (verified = 'PENDING')

    $token = $user->createToken('auth_token')->plainTextToken;
    return response()->json(['token' => $token, 'user' => $user, 'role' => $user->role]);
}
```

Passwords are stored **plain text** on purpose, because Oracle APEX's `custom_auth()` PL/SQL function compares them as plain text (see Q16). Sanctum issues a Bearer token used by the React frontend.

---

## 3. Authentication vs Authorization

|  | Authentication | Authorization |
|---|---|---|
| Question | Who are you? | Are you allowed? |
| Where | `AuthController::login()` | `app/Http/Middleware/EnsureRole.php` |
| When | Once per login | Every protected request |
| Mechanism | `User::updateOrCreate` + Sanctum token | `middleware('role:trader')` checks `$user->role` |

---

## 4. Authorization — traders see only their own data

**Middleware:** `app/Http/Middleware/EnsureRole.php` (lines 10–20)

```php
public function handle(Request $request, Closure $next, string ...$roles): Response {
    $user = $request->user();
    if (!$user)                            return response()->json(['message' => 'Unauthenticated.'], 401);
    if (!in_array($user->role, $roles, true)) return response()->json(['message' => 'Forbidden.'], 403);
    return $next($request);
}
```

**Query scoping** (`TraderController.php` ≈ lines 14–15):

```php
$shopId = $request->user()->trader?->shop_id;
if (!$shopId) return response()->json(['message' => 'No shop assigned.'], 403);
$totalProducts = Product::where('shop_id', $shopId)->count();
```

**Order ownership** (`OrderController.php` ≈ lines 50–56) joins through `Payment` because `ORDER_TABLE` has no `user_id` column:

```php
$ownsThisOrder = Payment::where('order_id', $id)->where('user_id', $userId)->exists();
if (!$ownsThisOrder) return response()->json(['message' => 'Forbidden.'], 403);
```

---

## 5. `||` in SQL

Oracle's string concatenation operator — used inside the ID-generation triggers in `database/migrations/2026_05_21_000100_create_oracle_sequences_and_triggers.php` (line ~165):

```sql
:NEW.<pk_col> := '<PREFIX>' || TO_CHAR(<seq>.NEXTVAL, 'FM00000');
-- e.g. produces 'U00101', 'S04201', 'P07901', …
```

Also used to build `RAISE_APPLICATION_ERROR` messages inside several triggers. PHP equivalent is `.`, C++ would be `+`.

---

## 6. Registration / trader-creation errors

The only programmatic trader registration path is admin-driven via `AdminController.php` (`createTrader`, lines 58–96):

| Error | Cause |
|-------|-------|
| `"This shop already has a trader assigned."` (422) | Existing trader row found for the shop (lines 70–72) |
| Validation failures (email unique, shop exists, etc.) | Standard FormRequest validation |
| `"Email already in use as a customer/admin."` | Email exists with another role |

**Difference from doc:** there is **no 10-trader global cap** in this codebase, and no self-service "trader pending" email — approval is just `verified = 'PENDING' → 'YES'` set by admin.

---

## 7. Cart 20-item limit

Enforced in **two places**:

**Database trigger** `trig_cart_limit` in migration `2026_05_21_000100…` (lines 204–223):

```sql
CREATE OR REPLACE TRIGGER trig_cart_limit
BEFORE INSERT ON Product_Cart
FOR EACH ROW
DECLARE v_count NUMBER;
BEGIN
    SELECT NVL(Item_Count, 0) INTO v_count
    FROM   Cart_Table WHERE Cart_id = :NEW.Cart_id FOR UPDATE;
    IF v_count + 1 > 20 THEN
        RAISE_APPLICATION_ERROR(-20001, 'Cart cannot have more than 20 products');
    END IF;
    UPDATE Cart_Table SET Item_Count = v_count + 1 WHERE Cart_id = :NEW.Cart_id;
END;
```

**Application check** in `CartController.php` (≈ line 73):

```php
if ($cart->item_count + 1 > $cart->max_item) {
    return response()->json(['message' => 'Cart is full.'], 422);
}
```

The trigger is the hard ceiling (even if `max_item` column says 50, trigger still rejects the 21st distinct product). Limit counts distinct products, not total quantity.

---

## 8. Responsive design

Yes — **Tailwind CSS v4** via `@tailwindcss/vite` (`package.json` → `@tailwindcss/vite ^4.0.0`, wired in `vite.config.js`). Tailwind config is inline (no separate `tailwind.config.js`).

`resources/css/app.css`:

```css
@import 'tailwindcss';
@source '../**/*.blade.php';
@source '../**/*.jsx';
.wrap { max-width: 1152px; margin: 0 auto; padding: 0 1rem; }
```

Breakpoints used in JSX/Blade: `sm:` 640px, `md:` 768px, `lg:` 1024px, `xl:` 1280px (Tailwind defaults). Mobile-first — unprefixed classes apply everywhere.

---

## 9. Email verification + expiry

**`app/Mail/VerificationMail.php`** exists (lines 10–31) with a Blade view at `resources/views/emails/verification.blade.php`, but it is **not wired into the auth flow**. Customers are created with `verified = 'YES'` immediately (`AuthController.php` line 56).

What is actually sent: a plain welcome email via `POST /send-welcome-email` (`routes/api.php` lines 32–58) using `Mail::html(...)` — **no signed URL, no expiry, no verification link**.

**Difference from doc:** the 60-minute signed URL / `URL::temporarySignedRoute` flow described in the reference does not exist in this build. The 24-hour rule in the doc actually belongs to collection-slot booking — see Q24.

---

## 10. Concatenation

```php
// PHP — dot operator (AuthController.php line ~72)
'Required role: ' . implode('|', $roles)
```

```sql
-- Oracle SQL — || operator (sequences/triggers migration, line ~165)
:NEW.User_id := 'U' || TO_CHAR(User_Table_seq.NEXTVAL, 'FM00000');
```

No IoT / C++ code in this project, so no `+` string concatenation example from firmware.

---

## 11. OCI connection / `oci_parse()`

**File:** `config/database.php` (lines 35–52). Driver is `oracle` (yajra `laravel-oci8` package, judging from `tns`, `service_name`, `edition`, `server_version` keys).

```php
'oracle' => [
    'driver'         => 'oracle',
    'tns'            => env('DB_TNS', ''),
    'host'           => env('DB_HOST', ''),
    'port'           => env('DB_PORT', '1521'),
    'database'       => env('DB_DATABASE', ''),
    'service_name'   => env('DB_SERVICE_NAME', ''),
    'username'       => env('DB_USERNAME', ''),
    'password'       => env('DB_PASSWORD', ''),
    'charset'        => env('DB_CHARSET', 'AL32UTF8'),
    'edition'        => env('DB_EDITION', 'ora$base'),
    'server_version' => env('DB_SERVER_VERSION', '11g'),
],
```

The app never calls `oci_parse()` directly — the OCI8 driver internally does `oci_pconnect → oci_parse → oci_bind_by_name → oci_execute` for every Eloquent query, and raw PL/SQL (functions, triggers) is shipped via `DB::unprepared()` inside migrations.

---

## 12. APEX ↔ Laravel integration

They share **the same Oracle schema**, plus a thin **REST proxy** in `app/Http/Controllers/ApexController.php`:

- `GET /api/apex/token` — fetches an OAuth2 token from APEX (health check).
- `GET /api/apex/{path}` — proxies generic APEX REST modules.

The PL/SQL function `custom_auth` (Q16) and procedure `set_user_session` (which sets `:APP_USER_ROLE` / `:APP_USER_ID` via `v('APP_USER')`) let APEX authenticate against the same `User_Table` Laravel writes to. No embedded iframes; no shared session — they are two independent apps over one database.

---

## 13. Triggers

All defined in `database/migrations/2026_05_21_000100_create_oracle_sequences_and_triggers.php`. **~27 triggers**, split into ID-generation and business-logic.

**ID + timestamp triggers** (lines 134–171) — one per table, populate the PK from its sequence and set `Created_at`:

`trig_user_table`, `trig_shop_table`, `trig_category_table`, `trig_discount_table`, `trig_product_table`, `trig_favorite_table`, `trig_review_table`, `trig_collection_slot`, `trig_order_table`, `trig_payment_table`, `trig_cart_table`, `trig_product_order`, `trig_product_cart`, `trig_product_favorite`.

**Business-logic triggers** (lines 176–325):

| Trigger | Table | Enforces |
|---|---|---|
| `trig_check_slot_capacity` | ORDER_TABLE | 24-hour lead time + per-slot capacity; increments `Booked_Count` |
| `trig_cart_limit` | PRODUCT_CART | Max 20 distinct products per cart (-20001) |
| `trig_cart_delete` | PRODUCT_CART | Decrements `Item_Count` on delete |
| `trig_payment_update_order` | PAYMENT_TABLE | Sets `Order.status = 'Paid'` when payment completes |
| `trig_discount_expiry` | DISCOUNT_TABLE | Auto-deactivates expired discounts; defaults `Is_Active = 'YES'` |
| `trig_user_updated_at` / `_shop_` / `_review_` / `_slot_` | … | Maintain `Updated_at` on BEFORE UPDATE |
| `trig_product_availability` | PRODUCT_TABLE | Sets `Is_Available` based on `Stock_Qantity` |
| `trig_product_order_stock` | PRODUCT_ORDER | Validates stock + max_order, decrements stock, computes `Sub_Total` |
| `trig_apply_discount_to_products` | DISCOUNT_TABLE | Auto-links a new discount to that trader's products |
| `trig_clear_discount_before_delete` | DISCOUNT_TABLE | Nulls `Discount_id` on products before delete |

**Why both triggers and PHP validation?** APEX writes to the same tables and bypasses Laravel entirely — triggers guarantee invariants regardless of which app writes.

---

## 14. Tables

22 total (20 domain + 2 Laravel infrastructure):

1. `cache`, `cache_locks` (Laravel)
2. `personal_access_tokens` (Sanctum)
3. `user_table`
4. `customer_table`
5. `trader_table`
6. `shop_table`
7. `category_table`
8. `discount_table`
9. `product_table`
10. `collection_slot`
11. `order_table`
12. `product_order`
13. `payment_table`
14. `cart_table`
15. `product_cart`
16. `favorite_table`
17. `product_favorite`
18. `sessions`
19. `review_table`
20. `contact_messages`
21. `migrations` (auto)

**Difference from doc:** no separate `admin` table — admin is a role on `user_table`. No `password_reset_tokens` (no password reset flow).

---

## 15. Sequences

17 explicit sequences in the same migration (lines 25–43), each with its own start value and increment:

`User_Table_seq` (101 / 10), `Customer_Table_seq` (1001 / 2), `Trader_Table_seq` (2001 / 3), `Management_Table_seq` (3001 / 1), `Shop_Table_seq` (4201 / 5), `Category_Table_seq` (5001 / 1), `Discount_Table_seq` (6181 / 3), `Product_Table_seq` (7901 / 9), `Favorite_Table_seq` (8321 / 8), `Reviwe_Table_seq` (9001 / 7 — sic), `Collection_Slot_table_seq` (10001 / 6), `Order_Table_seq` (11001 / 5), `Payment_Table_seq` (12001 / 4), `Cart_Table_seq` (13001 / 3), `Product_Order_seq` (14001 / 2), `Product_Cart_seq` (15121 / 1), `Product_Favorite_seq` (16361 / 3).

---

## 16. Authentication function in the database

It's called **`custom_auth`**, not `USER_AUTH` — migration `2026_05_21_000100…` lines 67–82:

```sql
CREATE OR REPLACE FUNCTION custom_auth (
    p_username IN VARCHAR2,
    p_password IN VARCHAR2
) RETURN BOOLEAN AS
    l_user_exists NUMBER := 0;
BEGIN
    SELECT COUNT(*) INTO l_user_exists
    FROM   User_Table
    WHERE  LOWER(TRIM(Email)) = LOWER(TRIM(p_username))
      AND  Password = TRIM(p_password);            -- plaintext compare
    RETURN l_user_exists > 0;
EXCEPTION
    WHEN OTHERS THEN RETURN FALSE;
END;
```

Used by **APEX** as its custom authentication scheme — Laravel never calls it. There's also a procedure `set_user_session()` (lines 88–106) that uses `v('APP_USER')` to populate `:APP_USER_ROLE` / `:APP_USER_ID` for APEX authorization.

---

## 17. Mail system

| Mailable | When sent | Where |
|---|---|---|
| `VerificationMail` | **never** in current code — class exists but is orphaned | `app/Mail/VerificationMail.php` |
| Welcome email (inline HTML, not a Mailable) | After React signup hits `/send-welcome-email` | `routes/api.php` lines 32–58 |

**Difference from doc:** no `WelcomeEmail`, `TraderPending`, `TraderApproved`, `ContactFormMail`, or `OrderConfirmation` mailables exist. Only the welcome email is actually sent.

---

## 18. IoT code

**Hardware:** ESP32 Dev Module + PIR motion sensor on GPIO 13, mounted at the collection point. (Full write-up: `docs/12-iot-connectivity.md`.)

**Main functionality — live "Collection Point is Busy / Moderate / Open" room monitor.** The ESP32 counts motion events in a rolling 15-second window, classifies as `not_busy` / `moderate` / `busy`, and POSTs once per second to Laravel. React polls the same endpoint once per second and re-renders the status card at `/room-monitor`.

```
ESP32 (PIR on GPIO13)
   │
   ├── WiFi → POST <ngrok URL>/api/motion           (every 1s, X-Api-Key header)
   │              │
   │       MotionController::store()
   │              │
   │     Cache::put("motion:room-101", $data)       ← Laravel file cache, no DB
   │
   └── React /room-monitor polls GET /api/motion/latest (every 1s)
```

**Server side** (`app/Http/Controllers/MotionController.php`):

```php
public function store(Request $request): JsonResponse {
    if ($request->header('X-Api-Key') !== config('services.esp32.api_key')) {
        return response()->json(['error' => 'Unauthorized'], 401);
    }
    $data = $request->validate([
        'device_id'    => 'required|string|max:50',
        'status'       => 'required|in:not_busy,moderate,busy',
        'motion_count' => 'required|integer|min:0',
        'uptime_ms'    => 'required|integer|min:0',
    ]);
    $data['received_at'] = now()->toISOString();
    Cache::put("motion:{$data['device_id']}", $data);
    return response()->json(['success' => true], 200);
}
```

**Firmware side** (`arduino/room-monitor.ino`, C++):

```cpp
const unsigned long WINDOW_MS = 15000;
const char* classify(int n) {
    if (n == 0) return "not_busy";
    if (n <= 5) return "moderate";
    return "busy";
}
// outbound JSON (1 Hz)
{ "device_id":"room-101", "status":"moderate", "motion_count":3, "uptime_ms":482194 }
```

**Why no DB?** The reading is only useful in real time — a 5-minute-old "busy" value is noise. The latest per-device payload lives in Laravel's file cache (`storage/framework/cache/`) and is overwritten every second. Zero schema, zero migration.

**Why ngrok?** The ESP32 needs a stable, publicly reachable URL. The PC's LAN IP rotates with DHCP and campus WiFi blocks client-to-client traffic, so the firmware targets a `ngrok http 8000` tunnel (which also gives free HTTPS) instead of a baked-in LAN IP.

**Auth:** the route is public (the ESP32 has no Sanctum token) — instead, `MotionController::store` checks an `X-Api-Key` header against `config('services.esp32.api_key')` (env var `ESP32_API_KEY`).

> Note: this code is documented in `cleckhive/docs/12-iot-connectivity.md` but is not present in the `Team16Project\TeamProject` snapshot I scanned — that snapshot has no `MotionController.php`, `arduino/` folder, or `/api/motion` route. Confirm which branch/snapshot is on your viva machine before the demo.

---

## 19. Trader registration → dashboard

Dashboard is **rendered dynamically by React on demand** — there is no per-trader dashboard record created.

1. Trader logs in via `POST /oracle-login` (`AuthController::login`) — creates rows in `user_table` + `trader_table` with `verified = 'PENDING'`. No shop is created.
2. An admin approves via `PATCH /api/admin/traders/{id}/approve` (`AdminController.php` lines 119–133) which flips `verified` to `'YES'`.
3. The admin must also assign a shop to the trader (no auto-creation).
4. On next login, the React route `<RequireAuth role="Trader">` (App.jsx lines 54–61) lets them through, and `TraderDashboard.jsx` calls `GET /api/trader/stats` (`TraderController.php` lines 11–27), which returns 403 if no `shop_id` is assigned.

---

## 20. `v('APP_USER')`

An APEX-only built-in that returns the username of whoever is logged into the APEX app. Used **inside the database** by `set_user_session()` (migration line 97):

```sql
WHERE LOWER(Email) = LOWER(v('APP_USER'))
```

Not used in Laravel — Laravel uses `Auth::user()` / `$request->user()` for the equivalent concept, but they are separate sessions.

---

## 21. Where is the password hashed?

**It isn't.** No `Hash::make()` or `bcrypt()` call exists in the project. `AuthController.php` line 44 stores `$request->password` (or a random string) verbatim. This is required so APEX's `custom_auth()` PL/SQL function (Q16) can `Password = TRIM(p_password)` against the same column. Acceptable for an academic project tied to APEX; not appropriate for production.

---

## 22. Frontend ↔ Backend connection

Frontend is **React 19 + Vite + react-router-dom v7** — not Blade-rendered forms. The only Blade file used is `home.blade.php`, which is the React mount point.

- HTTP client: **Axios** (`resources/js/api/axios.js`)
- Calls: `api.post('/api/...', payload)`, `api.get(...)`, etc.
- Auth: Sanctum Bearer token in the `Authorization` header
- State: React Context (`AuthContext`, `FavoritesContext`)

Backend responds with `response()->json(...)` everywhere; no `view()` / `redirect()->with()` flow.

---

## 23. Charts

Yes — **Recharts v3.8** (`package.json` line 26).

Used in `AdminDashboard.jsx` (sales bar chart + customer pie chart), `TraderAnalytics.jsx`, and `AdminReport.jsx`:

```jsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend, ResponsiveContainer } from 'recharts';
<BarChart data={barData}><Bar dataKey="value" fill="#8884d8" /></BarChart>
```

**Difference from doc:** doc claimed "no chart library" — this build does have charts (added later via Recharts).

---

## 24. Collection slot — 24-hour rule

**Trigger** `trig_check_slot_capacity` (migration lines 179–203):

```sql
IF v_slot_date < SYSDATE + 1 THEN
    RAISE_APPLICATION_ERROR(-20012,
        'Collection slot must be booked at least 24 hours in advance.');
END IF;
```

**Controller mirror** in `CollectionSlotController.php` lines 67–69 (calls `CollectionSlot::hasEnoughLeadTime()` on the model):

```php
if (!$slot->hasEnoughLeadTime()) {
    return ['error' => 'Slot must be booked at least 24 hours in advance.', 'status' => 422];
}
```

Capacity (`Booked_Count < slot_max`) is enforced by the same trigger.

---

## 25. User-defined PHP functions (accessors / mutators / helpers)

Mostly Eloquent accessors used to paper over Oracle column-name typos and to centralise business logic:

**`Product.php`:** `getStockQuantityAttribute()` / `setStockQuantityAttribute()` (maps DB column `Stock_Qantity` → `stock_quantity`), `isAvailable()`, `hasActiveDiscount()`, `discountedPrice()`.

**`Cart.php`:** `getMaxItemsAttribute()` / `setMaxItemsAttribute()` (backwards-compat for `max_items` vs `max_item`).

**`CartItem.php`:** `getCartItemIdAttribute()` — maps `product_cart_id` to `cart_item_id`.

**`Review.php`:** `getCommentAttribute()` / `setCommentAttribute()` — Oracle column `Comments` ↔ `comment`.

**`User.php`:** `isCustomer()`, `isTrader()`, `isAdmin()` role helpers.

**`Trader.php` / `Customer.php`:** `isVerified()`.

**`Shop.php`:** `isActive()`.

**In Oracle:** function `custom_auth(p_username, p_password)` returning BOOLEAN (Q16) and procedure `set_user_session()`.

---

## 26. How data is transferred — frontend ↔ backend

**Frontend → Backend** (React/Axios → Laravel):
```js
await api.post('/api/cart/items', { product_id: 7901, quantity: 2 });
```
Server reads with `$request->input(...)`, `$request->validated()`, etc.

**Backend → Frontend** (always JSON, no Blade renders for data):
```php
return response()->json(['success' => true, 'data' => $cart], 200);
```

**Auth:** every request carries `Authorization: Bearer <sanctum token>`.

**External:** PayPal calls from `PaymentController` via Laravel's `Http::post()`.

---

## 27. Guest cart / checkout

**Guests cannot use the cart at all** in this build — every cart and checkout route sits behind both `auth:sanctum` and `role:customer` (`routes/api.php` lines 153–170):

```php
Route::middleware('auth:sanctum')->group(function () {
    Route::middleware('role:customer')->group(function () {
        Route::get('/cart',         [CartController::class, 'index']);
        Route::post('/cart/items',  [CartController::class, 'addItem']);
        Route::post('/orders',      [OrderController::class, 'store']);
        Route::post('/paypal/create-order', [PaymentController::class, 'createPayPalOrder']);
    });
});
```

React also enforces this client-side with `<RequireAuth role="Customer">` (App.jsx lines 54–61) — guests are redirected to `/login`.

**Difference from doc:** doc described a guest session cart that merges into the DB on login. That session-cart code does not exist here.

---

## Summary of differences from the reference doc

| Doc claim | Actual code |
|---|---|
| `LoginRequest::authenticate()` | `AuthController::login()` |
| `EnsureUserIsTrader` middleware | Generic `EnsureRole` middleware |
| Multiple mailables (`WelcomeEmail`, `TraderApproved`, …) | Only `VerificationMail` exists (and isn't used); welcome email is inline HTML |
| Customer passwords hashed with bcrypt | **No** hashing — all passwords plaintext (APEX compatibility) |
| Email verification with signed 60-min URL | Not implemented; customers auto-verified |
| Trader cap = 10 | No global cap; only one-trader-per-shop rule |
| Guest session cart merged on login | Cart is auth-only; no guest cart |
| Function name `USER_AUTH` | Actual name `custom_auth` |
| No charts | Recharts is used in admin/trader dashboards |
| IoT firmware + `/api/stock/update` (weight-to-stock) | Different IoT feature: ESP32 + PIR motion → `/api/motion` → `/room-monitor` page (busy/moderate/open). Documented in `docs/12-iot-connectivity.md`; not present in the snapshot I scanned. |
| `app/Http/Requests/ProfileUpdateRequest.php` etc. | Only `AddCartItemRequest` exists in `app/Http/Requests/` |
| 3 triggers | ~27 triggers (14 ID-gen + 13 business-logic) |
