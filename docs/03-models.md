# 03 — Models

All models in `app/Models/` extend `Illuminate\Database\Eloquent\Model` and
map to the same table name (with the typo-faithful column names from Oracle).

| Model            | Table                | Notable                                                        |
|------------------|----------------------|----------------------------------------------------------------|
| `User`           | `user_table`         | `extends Authenticatable`, `HasApiTokens` (Sanctum), helpers `isCustomer/Trader/Admin`. Order via `hasManyThrough(Payment)` because ORDER_TABLE has no user_id. |
| `Customer`       | `customer_table`     | Subtype, PK = user_id.                                         |
| `Trader`         | `trader_table`       | Subtype, PK = user_id, `hasOne(Shop)`.                         |
| `Shop`           | `shop_table`         | belongsTo Trader, hasMany Products.                            |
| `Category`       | `category_table`     | hasMany Products.                                              |
| `Product`        | `product_table`      | `stock_qantity` (sic) + accessor `stock_quantity`. `discountedPrice()` factors in active discount. |
| `Discount`       | `discount_table`     | `isActive()` checks dates + flag.                              |
| `Favorite`       | `favorite_table`     | Wishlist header, hasMany ProductFavorite.                      |
| `Cart`           | `cart_table`         | hasMany CartItem, belongsTo Customer.                          |
| `CartItem`       | `product_cart`       | Cart line.                                                     |
| `CollectionSlot` | `collection_slot`    | Slot capacity tracking.                                        |
| `Order`          | `order_table`        | No user_id; `customer()` via Payment.                          |
| `ProductOrder`   | `product_order`      | Order line, qty + unit_price + sub_total (auto by trigger).    |
| `Payment`        | `payment_table`      | belongsTo User, belongsTo Order.                               |
| `Review`         | `review_table`       | belongsTo Customer + Product.                                  |
| `ContactMessage` | (Laravel-only table) | "Contact us" form submissions.                                 |

## PK generation pattern

Every model overrides `booted()` to mint its prefixed PK from the
matching Oracle sequence when no ID is supplied:

```php
protected static function booted(): void
{
    static::creating(function (self $p) {
        if (empty($p->product_id)) {
            $p->product_id = 'P' . str_pad(
                (string) \DB::scalar("SELECT Product_Table_seq.NEXTVAL FROM dual"),
                5, '0', STR_PAD_LEFT
            );
        }
    });
}
```

A `BEFORE INSERT` trigger does the same thing on the DB side, so APEX
inserts and direct ORDS inserts also get IDs.

## Casts you'll meet

- Date columns are cast to `date` (most tables).
- `decimal:2` on prices/amounts.
- Integers explicitly cast on stock / quantity columns.

## Eloquent gotchas in this project

- **`$timestamps = false`** on most models because Oracle columns are bare `DATE`
  (not `created_at`/`updated_at` pairs) and managed by DB triggers.
- **`$primaryKey` is a VARCHAR2(10) string** — `$keyType = 'string'`,
  `$incrementing = false` everywhere.
- **`Product::$binaries`** doesn't actually take effect because we don't
  extend yajra's `OracleEloquent`. BLOB writes use raw PDO (see ProductSeeder).
