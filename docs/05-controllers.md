# 05 — Controllers

All in `app/Http/Controllers/`.

| Controller                  | Responsibility                                                                          |
|-----------------------------|------------------------------------------------------------------------------------------|
| `AuthController`            | `/oracle-login`, `/logout`, `/me`, `/me` patch. Creates/updates `USER_TABLE` row, mints Sanctum token. Stores plaintext password (matches `custom_auth`). |
| `AdminController`           | `/admin/stats`, `/admin/users`. Dashboard metrics, user listings.                       |
| `ApexController`            | Proxies arbitrary `/apex/{path}` GETs to the ORDS instance for read-through access.     |
| `CartController`            | List, add, update, remove, clear cart items for current customer.                       |
| `CategoryController`        | CRUD for categories; admin-only writes.                                                 |
| `CollectionSlotController`  | List slots; reserve a slot (fires `trig_check_slot_capacity`); admin creates new slots. |
| `ContactController`         | Stores "Contact Us" form submissions into `contact_messages`.                           |
| `OrderController`           | Place order, list current customer's orders, cancel, update status (trader), traderOrders list. |
| `PaymentController`         | PayPal sandbox flow — `createPayPalOrder` + `captureAndComplete` → inserts `PAYMENT_TABLE` row, trigger flips order to 'Paid'. |
| `ProductController`         | Browse + filter products; trader CRUD; set/clear discount.                              |
| `ReviewController`          | List + customer create reviews (verified-purchase check would live here).               |
| `ShopController`            | List/show shops; admin CRUD.                                                            |
| `TraderController`          | `/trader/stats` — per-trader sales totals.                                              |

## Patterns used everywhere

- **Validation**: `$request->validate([...])` at the top of every write method.
- **Auth user**: `$request->user()` (Sanctum) — never trust IDs from the body.
- **JSON envelope**: `{ success: true, data: ... }` / `{ success: false, message: '…' }`.
- **Eloquent eager loads**: `->with(['shop','category','discount'])` to spare round trips.
- **No transactions on writes that depend on Oracle triggers** — the triggers raise -20xxx errors which propagate up as `QueryException`.

## Auth normalisation (gotcha)

`AuthController::normalizeRole()` forces PascalCase (`Admin`, `Trader`, `Customer`) because the Oracle CHECK constraint rejects anything else. Always feed it through this before persisting.

## Files-upload variant

`POST /products/{id}` exists alongside `PUT /products/{id}` purely because
multipart uploads through `PUT` in PHP are awkward. The frontend uses the
`POST` variant when a new image is attached.
