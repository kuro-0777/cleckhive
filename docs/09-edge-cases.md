# 09 — Edge Cases & Instructor Q&A

A grab-bag of "why does this work like that?" answers.

## Triggers raise -20xxx — handle them in PHP

| Code     | When                                                                              |
|----------|-----------------------------------------------------------------------------------|
| -20001   | Cart already has 20 products / collection slot full                               |
| -20002   | Cart not found when adding line                                                   |
| -20012   | Collection slot booked < 24h in advance                                           |
| -20030   | Insufficient stock                                                                |
| -20031   | Quantity exceeds product `max_order`                                              |

`yajra/laravel-oci8` propagates these as `Illuminate\Database\QueryException`.
Catch on the controller side and return a friendly 422.

## ORDER_TABLE has no user_id

By design — the schema models ownership through `PAYMENT_TABLE.user_id`.
That's why `User::orders()` is a `hasManyThrough(Payment)`. If you need
"this customer's orders" SQL, JOIN through payment.

## Plaintext passwords

See `06 — Middleware & Auth`. Justified by the shared `custom_auth` PL/SQL
function. If you ever want bcrypt, you'd need to (a) replace `custom_auth`
with a hash-aware version, or (b) split the password column (one for APEX,
one for Laravel — and explain that in the report).

## BLOB inserts blow up with ORA-01465

Eloquent serialises binary as a hex literal which Oracle then can't parse.
Workaround used in `ProductSeeder`:

```php
Product::create([...without image...]);
$pdo = DB::connection()->getPdo();
$stmt = $pdo->prepare("UPDATE product_table SET image = :img WHERE product_id = :pid");
$stmt->bindParam(':img', $bytes, PDO::PARAM_LOB);
$stmt->bindParam(':pid', $id);
$stmt->execute();
```

## Sequence "advanced" values

Sequences start far above the seed PKs (e.g. `Product_Table_seq` starts
at 7901) because they came from a production-ish DB export. Re-running
`migrate:fresh` re-creates them at those values; seeds use hard-coded PK
strings so they don't collide with sequence-minted IDs.

## Discount auto-link

When a trader inserts a `DISCOUNT_TABLE` row, `trig_apply_discount_to_products`
immediately updates every product in any of their shops to point at the new
`discount_id`. Deleting the discount nulls them back out. There's no UI to
"apply to one product only"; the model is shop-wide.

## Guest cart

`ProductPage` falls back to `localStorage['local_cart']` when there's no
user. `Cart.jsx` already renders that. On login,
`utils/cart.js#mergeLocalCartToBackend(api)` POSTs each line to `/cart/items`
and clears local storage. Hook it into your login success callback.

## CORS for ORDS

The browser hits ORDS direct at `:8080`. ORDS rejects unknown origins:

```sql
BEGIN
  ORDS.SET_MODULE_ORIGINS_ALLOWED(
    p_origins_allowed => 'http://localhost:5173,http://localhost:8000'
  );
  COMMIT;
END;
/
```

## APEX session vars

If the admin app shows "Access Denied" everywhere, the `set_user_session`
procedure isn't running (or never created). It's in the Laravel migration,
so a `migrate:fresh` recreates it. Verify:

```sql
SELECT object_name FROM user_objects WHERE object_name IN ('CUSTOM_AUTH','SET_USER_SESSION');
```
