# Part 6 — Trader Views

All trader routes are gated by `role:trader` middleware in `routes/api.php`.

## TraderDashboard (`pages/trader/TraderDashboard.jsx`)

| Element                  | Action                                                 |
|--------------------------|--------------------------------------------------------|
| Tile "View Products"     | `navigate('/trader/products')`                          |
| Tile "Add Product"       | `navigate('/trader/products/new')`                      |
| Tile "Analytics"         | `navigate('/trader/analytics')`                         |
| KPI numbers              | `GET /api/trader/stats`                                 |

## TraderViewProducts (`/trader/products`)

| Element       | Action                                              |
|---------------|-----------------------------------------------------|
| Search box    | client-side filter                                  |
| Row → Edit    | `navigate('/trader/products/:id/edit')`             |
| Row → Delete  | opens `TraderDeleteProduct` modal                    |

Data: `GET /api/products` filtered to the trader's `shop_id`.

## TraderAddProduct (`/trader/products/new`)

| Element             | Action                                                                                 |
|---------------------|----------------------------------------------------------------------------------------|
| Form Submit         | `POST /api/products` (or with `image` as multipart). Trigger sets `is_available` from stock. |
| Cancel              | `navigate('/trader/products')`                                                         |

## TraderUpdateProduct (`/trader/products/:id/edit`)

| Element             | Action                                                                                |
|---------------------|---------------------------------------------------------------------------------------|
| Form Submit         | `PUT /api/products/{id}` (or `POST` for multipart)                                    |

## TraderDeleteProduct (modal)

| Element             | Action                                              |
|---------------------|-----------------------------------------------------|
| Confirm Delete      | `DELETE /api/products/{id}`                          |

## TraderDiscounts (`/trader/discounts`)

| Element                  | Action                                                                  |
|--------------------------|-------------------------------------------------------------------------|
| Create discount          | `POST /api/products/{id}/discount` (or all products via a single POST)  |
| Remove discount          | `DELETE /api/products/{id}/discount`                                    |

Insert fires `trig_apply_discount_to_products` — applies to every product in any shop owned by that trader. `trig_clear_discount_before_delete` nulls product references before delete.

## TraderProfile / TraderAddress

`PATCH /api/me` for personal details; shop fields go through `PUT /api/shops/{id}` (admin only) — traders usually request changes via Contact.

## TraderAnalytics / TraderReport

`GET /api/trader/stats` + `GET /api/trader/orders` aggregated client-side.

## TraderReceipt

`window.print()`-friendly view of a single order's lines for the trader.
