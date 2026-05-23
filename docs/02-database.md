# 02 — Database & Migrations

Oracle schema `TEAM16` in pluggable database `XEPDB1`. Every table has a
sequence + a `BEFORE INSERT` trigger that mints a prefixed PK if one isn't
supplied (`U00010`, `S04205`, `P07910`, …).

## Entity map

```
USER_TABLE ──┬── CUSTOMER_TABLE ── FAVORITE_TABLE ── PRODUCT_FAVORITE ── PRODUCT_TABLE
             │                  └─ CART_TABLE     ── PRODUCT_CART    ──┘
             ├── TRADER_TABLE   ── SHOP_TABLE     ── PRODUCT_TABLE
             │                  └─ DISCOUNT_TABLE ── PRODUCT_TABLE
             └── (Admin role, no subtype)

ORDER_TABLE ── PRODUCT_ORDER ── PRODUCT_TABLE
            └─ COLLECTION_SLOT
            └─ PAYMENT_TABLE ── CUSTOMER_TABLE (= ORDER ownership)
```

## Tables

| Table              | PK prefix | Purpose                                              |
|--------------------|-----------|------------------------------------------------------|
| USER_TABLE         | `U`       | Master users; `Role IN ('Admin','Trader','Customer')` |
| CUSTOMER_TABLE     | inherits  | Customer subtype + loyalty_points + verified         |
| TRADER_TABLE       | inherits  | Trader subtype + verified                            |
| SHOP_TABLE         | `S`       | One per trader; address, type, logo BLOB             |
| CATEGORY_TABLE     | `C`       | Product categories                                   |
| PRODUCT_TABLE      | `P`       | Stock, price, image BLOB, allergy, max_order         |
| DISCOUNT_TABLE     | `D`       | Trader-wide % discount, start/end dates              |
| FAVORITE_TABLE     | `F`       | A customer's wishlist header                         |
| PRODUCT_FAVORITE   | `PF`      | Wishlist line items                                  |
| CART_TABLE         | `CT`      | One per customer, item_count + max_item              |
| PRODUCT_CART       | `PC`      | Cart line items                                      |
| COLLECTION_SLOT    | `CS`      | Market collection slot, capacity, booked_count       |
| ORDER_TABLE        | `OR`      | Order header — *no* user_id (owned via Payment)      |
| PRODUCT_ORDER      | `PO`      | Order line items                                     |
| PAYMENT_TABLE      | `PAY`     | Payment row; FK both customer + order                |
| REVIEW_TABLE       | `RE`      | Customer reviews on products                         |

## Triggers

Defined in `database/migrations/2026_05_21_000100_create_oracle_sequences_and_triggers.php`.

### ID + timestamp triggers
One `BEFORE INSERT` trigger per table that sets the prefixed PK (using its
sequence) when `:NEW.<id>` is null, and `Created_at := SYSDATE` where the
column exists.

### Business-rule triggers

| Trigger                              | Fires on              | Does                                                                                                          |
|--------------------------------------|-----------------------|----------------------------------------------------------------------------------------------------------------|
| `trig_check_slot_capacity`           | BEFORE INSERT order   | Rejects if slot < SYSDATE+1 or fully booked; bumps `booked_count`.                                            |
| `trig_cart_limit`                    | BEFORE INSERT pc      | Cap of 20 distinct lines per cart.                                                                            |
| `trig_cart_delete`                   | AFTER DELETE pc       | Decrements `Cart_Table.item_count`.                                                                           |
| `trig_payment_update_order`          | AFTER INSERT payment  | If payment.status='COMPLETED' → order.status='Paid'.                                                          |
| `trig_discount_expiry`               | BI/BU discount        | `Is_Active='NO'` if `End_Date < SYSDATE`, else default `'YES'`.                                               |
| `trig_product_availability`          | BI/BU product.stock   | Sets `Is_Available='YES'` if stock > 0, else `'NO'`.                                                          |
| `trig_product_order_stock`           | BEFORE INSERT po      | Decrements `Stock_Qantity`; raises -20030 if insufficient, -20031 if exceeds `max_order`. Fills `Sub_Total`.  |
| `trig_apply_discount_to_products`    | AFTER INSERT discount | Links the new discount to every product in any of that trader's shops.                                        |
| `trig_clear_discount_before_delete`  | BEFORE DELETE discount| Nulls `Product_Table.discount_id` so the discount row can be deleted.                                         |
| `trig_*_updated_at`                  | BEFORE UPDATE         | Sets `Updated_at := SYSDATE` on User/Shop/Review/Collection_Slot.                                             |

## Sequences

All `CACHE 20 NOCYCLE` with prefix-friendly start values:

| Seq                       | Start  | Inc |
|---------------------------|--------|-----|
| `User_Table_seq`          | 101    | 10  |
| `Customer_Table_seq`      | 1001   | 2   |
| `Trader_Table_seq`        | 2001   | 3   |
| `Management_Table_seq`    | 3001   | 1   |
| `Shop_Table_seq`          | 4201   | 5   |
| `Category_Table_seq`      | 5001   | 1   |
| `Discount_Table_seq`      | 6181   | 3   |
| `Product_Table_seq`       | 7901   | 9   |
| `Favorite_Table_seq`      | 8321   | 8   |
| `Reviwe_Table_seq` *(sic)*| 9001   | 7   |
| `Collection_Slot_table_seq`| 10001 | 6   |
| `Order_Table_seq`         | 11001  | 5   |
| `Payment_Table_seq`       | 12001  | 4   |
| `Cart_Table_seq`          | 13001  | 3   |
| `Product_Order_seq`       | 14001  | 2   |
| `Product_Cart_seq`        | 15121  | 1   |
| `Product_Favorite_seq`    | 16361  | 3   |

## Special functions / procedures

- **`custom_auth(p_username, p_password) RETURN BOOLEAN`** — APEX-side login.
  Plaintext compare against `User_Table.Password`. Used by the `Custom Auth` scheme in Cleckhiveapp.sql.
- **`set_user_session`** — APEX post-login process. Populates `:APP_USER_ROLE` and `:APP_USER_ID` from `User_Table`.

## Notable Oracle quirks the app works around

1. `PRODUCT_TABLE.STOCK_QANTITY` is misspelt in the source schema. Eloquent uses the misspelt column; an accessor exposes `stock_quantity` to PHP.
2. `ORDER_TABLE` has no `user_id`. Order ownership is computed via `PAYMENT_TABLE.user_id` (see `User::orders()` hasManyThrough).
3. `DISCOUNT_TABLE.user_id` FKs to `TRADER_TABLE.user_id` (not `USER_TABLE`); the unFK'd `trader_id` column is kept for label/reporting.
4. BLOB inserts via Eloquent throw `ORA-01465: invalid hex number`. Seed BLOBs via raw PDO with `PDO::PARAM_LOB` after the row exists.
