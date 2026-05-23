# Part 2 — Home & Products

## Home (`pages/customer/Home.jsx`)

| Element             | Action                                                |
|---------------------|-------------------------------------------------------|
| Hero CTA            | `navigate('/products')`                               |
| Category tile       | `navigate('/category/<name>')`                        |
| Featured product card | `navigate('/product/<id>')`                         |
| Newsletter "Subscribe" | optimistic toast; no backend call                  |

Data: `ordsProducts({ limit: 12 })`, `ordsCategories(...)` (or via Laravel `/api/products` and `/api/categories`).

## Category page (`pages/customer/CategoryPage.jsx`)

| Element              | Action                                                |
|----------------------|-------------------------------------------------------|
| Sort dropdown        | local state — re-sorts client-side                    |
| Filter (price / shop)| local state                                           |
| Product card click   | `navigate('/product/<id>')`                           |
| Add to cart (inline) | guest: `addToLocalCart(...)`; logged-in: ORDS upsert  |
| Heart icon           | `FavoritesContext.toggle(productId)`                  |

## Product page (`pages/customer/ProductPage.jsx`)

| Element             | Action                                                                                  |
|---------------------|-----------------------------------------------------------------------------------------|
| Quantity +/-        | local state, clamped to `max_order` and `stock_quantity`                                |
| Add to Cart         | `handleAddToCart(false)` — guest → `addToLocalCart`; user → `cart_table` + `product_cart`|
| Buy Now             | `handleAddToCart(true)` → then `navigate('/cart')`                                      |
| Heart icon          | `FavoritesContext.toggle`                                                               |
| Share button        | `navigator.share` if available, else `navigator.clipboard.writeText(href)`              |
| Submit Review       | `POST /api/reviews` (customer only)                                                     |
| Edit own review (✎) | inline form; submits as PATCH (route depends on backend; falls back to PUT)             |
| Delete own review   | `DELETE /api/reviews/{id}`                                                              |

### Add-to-cart algorithm (logged-in)

1. `GET cart_table/` → find row where `user_id = me`.
2. If missing → `POST cart_table/` with synthesised `CT<timestamp>` id.
3. `GET product_cart/` → check if `(cart_id, product_id)` already exists.
4. Exists → `PUT product_cart/{id}` with new quantity (existing + qty).
5. Else → `POST product_cart/` + `PUT cart_table/{id}` to bump `item_count`.

The Oracle trigger `trig_cart_limit` enforces a 20-item cap and raises ORA-20001 if hit.
