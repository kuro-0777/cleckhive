# 10 — Direct ORDS Calls from React

Some screens fetch data straight from Oracle REST Data Services (ORDS)
instead of going through Laravel. This skips PHP entirely and is faster
for read-heavy lists.

> Module: `resources/js/api/ords.js`
> Base URL: `VITE_ORDS_BASE` (default `http://localhost:8080/ords/teamproject`)

## Why ORDS direct?

- Read-heavy list views (products, shops, reviews) don't need
  controllers or validation.
- Lets the admin/APEX side and the React side share endpoint shapes.

## What needs to exist server-side

Every URL the frontend calls must be AutoREST-enabled (or a custom
ORDS module) under the `teamproject` URL-mapping pattern. One-shot setup:

```sql
BEGIN
  ORDS.ENABLE_SCHEMA(p_schema => 'TEAM16',
                     p_url_mapping_pattern => 'teamproject',
                     p_auto_rest_auth => FALSE);

  ORDS.ENABLE_OBJECT(p_object => 'PRODUCT_TABLE',    p_object_alias => 'products',         p_auto_rest_auth => FALSE);
  ORDS.ENABLE_OBJECT(p_object => 'REVIEW_TABLE',     p_object_alias => 'reviews',          p_auto_rest_auth => FALSE);
  ORDS.ENABLE_OBJECT(p_object => 'SHOP_TABLE',       p_object_alias => 'shops',            p_auto_rest_auth => FALSE);
  ORDS.ENABLE_OBJECT(p_object => 'ORDER_TABLE',      p_object_alias => 'orders',           p_auto_rest_auth => FALSE);
  ORDS.ENABLE_OBJECT(p_object => 'TRADER_TABLE',     p_object_alias => 'traders',          p_auto_rest_auth => FALSE);
  ORDS.ENABLE_OBJECT(p_object => 'USER_TABLE',       p_object_alias => 'user_table',       p_auto_rest_auth => FALSE);
  ORDS.ENABLE_OBJECT(p_object => 'COLLECTION_SLOT',  p_object_alias => 'collection_slot',  p_auto_rest_auth => FALSE);
  ORDS.ENABLE_OBJECT(p_object => 'CART_TABLE',       p_object_alias => 'cart_table',       p_auto_rest_auth => FALSE);
  ORDS.ENABLE_OBJECT(p_object => 'PRODUCT_FAVORITE', p_object_alias => 'product_favorite', p_auto_rest_auth => FALSE);
  ORDS.ENABLE_OBJECT(p_object => 'PRODUCT_CART',     p_object_alias => 'product_cart',     p_auto_rest_auth => FALSE);
  ORDS.ENABLE_OBJECT(p_object => 'PRODUCT_ORDER',    p_object_alias => 'product_order',    p_auto_rest_auth => FALSE);
  ORDS.ENABLE_OBJECT(p_object => 'PAYMENT_TABLE',    p_object_alias => 'payment_table',    p_auto_rest_auth => FALSE);
  ORDS.ENABLE_OBJECT(p_object => 'CATEGORY_TABLE',   p_object_alias => 'category_table',   p_auto_rest_auth => FALSE);
  ORDS.ENABLE_OBJECT(p_object => 'DISCOUNT_TABLE',   p_object_alias => 'discount_table',   p_auto_rest_auth => FALSE);
  ORDS.ENABLE_OBJECT(p_object => 'CUSTOMER_TABLE',   p_object_alias => 'customer_table',   p_auto_rest_auth => FALSE);
  ORDS.ENABLE_OBJECT(p_object => 'FAVORITE_TABLE',   p_object_alias => 'favorite_table',   p_auto_rest_auth => FALSE);
  COMMIT;
END;
/
```

Alias names **must match** what `ords.js` calls (e.g. plural `products`,
singular `cart_table`). Mismatched alias → 404.

## CORS

```sql
BEGIN
  ORDS.SET_MODULE_ORIGINS_ALLOWED(
    p_origins_allowed => 'http://localhost:5173,http://localhost:8000'
  );
  COMMIT;
END;
/
```

## Frontend helpers

```js
import { ordsProducts, ordsReviews, ordsShops, normalizeProduct } from '../api/ords'

const data = await ordsProducts({ limit: 50 })
const items = data.items.map(normalizeProduct)
```

Helpers exported by `ords.js`:

| Function                                       | URL                          |
|------------------------------------------------|------------------------------|
| `ordsProducts(params)`                         | `GET products/`              |
| `ordsReviews(params)`                          | `GET reviews/`               |
| `ordsShops(params)`                            | `GET shops/`                 |
| `ordsOrders(params)`                           | `GET orders/`                |
| `ordsTraders(params)`                          | `GET traders/`               |
| `ordsUsers(params)`                            | `GET user_table/`            |
| `ordsSlots(params)`                            | `GET collection_slot/`       |
| `ordsCart(params)`                             | `GET cart_table/`            |
| `ordsFavorites(params)`                        | `GET product_favorite/`      |
| `createProduct/updateProduct/deleteProduct`    | products CRUD                |
| `createOrder/updateOrder/deleteOrder`          | orders CRUD                  |
| `createReview/deleteReview`                    | reviews                      |
| `createSlot/updateSlot/deleteSlot`             | collection_slot              |
| `createCartRow/updateCartRow/deleteCartRow`    | cart_table                   |
| `createFavorite/deleteFavorite`                | product_favorite             |
| `updateTrader/updateUser`                      | trader / user updates        |

## Normalisers

ORDS returns lowercase OR uppercase column names depending on driver
version, so each row goes through a `normalize<Foo>()` that tolerates both:

```js
export const normalizeProduct = (p) => ({
  id:    p.product_id   ?? p.PRODUCT_ID,
  name:  p.product_name ?? p.PRODUCT_NAME,
  price: Number(p.price ?? p.PRICE ?? 0),
  ...
})
```

## resolveImage

`resolveImage(value)` figures out what to do with whatever's in the
`IMAGE` BLOB / column:

| Input                                  | Output                                        |
|----------------------------------------|-----------------------------------------------|
| empty / null                           | `null`                                        |
| `http…` or `data:…`                    | passed through                                |
| long string with no slashes (base64)   | wrapped as `data:image/jpeg;base64,…`         |
| relative path (`products/foo.jpg`)     | `${LARAVEL_URL}/storage/<path>`               |
