# Part 3 — Shops, Cart & Checkout

## Cart (`pages/customer/Cart.jsx`)

Two modes depending on `useAuth().user`:

| Mode    | Source                                                                 | Actions                                            |
|---------|------------------------------------------------------------------------|----------------------------------------------------|
| Guest   | `getLocalCart()` from `localStorage`                                   | qty/remove via `utils/cart.js` helpers             |
| Logged-in | `GET cart_table/` + `GET product_cart/` joined with `products` + active discounts | qty → `PUT product_cart/{id}`; remove → `DELETE product_cart/{id}` |

| Element                | Action                                                          |
|------------------------|-----------------------------------------------------------------|
| +/- qty                | `handleSetQty(item, newQty)`                                    |
| Trash icon             | `handleRemove(item)`                                            |
| Proceed to Checkout    | `navigate('/checkout')`                                         |
| "Go to Shop" (empty)   | `<Link to="/products">`                                         |

## Checkout (`pages/customer/Checkout.jsx`)

| Element                  | Action                                                |
|--------------------------|-------------------------------------------------------|
| Address fields           | local state, prefilled from `user.address`            |
| Select collection slot   | `GET /api/collection-slots/available`, click to select|
| PayPal buttons (sandbox) | `POST /api/paypal/create-order` → PayPal popup → `POST /api/paypal/capture` |
| Place Order (free path)  | `POST /api/orders` if not paying through PayPal       |

`PaymentController::captureAndComplete` inserts a `PAYMENT_TABLE` row with `status='COMPLETED'`. The Oracle trigger `trig_payment_update_order` flips `ORDER_TABLE.status` to `'Paid'`.

Slot reservation: `POST /api/collection-slots/{id}/reserve` — triggers `trig_check_slot_capacity` for 24-hour-advance + capacity check.

## Invoice (`pages/customer/Invoice.jsx`)

| Element            | Action                                  |
|--------------------|-----------------------------------------|
| Print button       | `window.print()`                         |
| "Back to Orders"   | `navigate('/orders')`                    |

Fetches `GET /api/orders/{id}` and renders order header + lines + payment ref.
