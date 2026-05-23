# Part 4 — Orders, Invoices, Account & Wishlist

## Orders list (`/orders`, rendered by Profile / Orders tab)

| Element              | Action                                                |
|----------------------|-------------------------------------------------------|
| Order row "View"     | `navigate('/invoice/<id>')`                            |
| "Cancel" (if Pending)| `PATCH /api/orders/{id}/cancel`                        |
| Filter chips         | local filtering (status: All / Paid / Pending / Cancelled) |

Data: `GET /api/orders` (returns just this customer's via `User->orders()` `hasManyThrough(Payment)`).

## Favorites (`pages/customer/Favorites.jsx`)

| Element            | Action                                              |
|--------------------|-----------------------------------------------------|
| Heart toggle       | `FavoritesContext.toggle(productId)`                |
| Product card click | `navigate('/product/<id>')`                          |
| "Move to cart"     | `addToLocalCart(...)` or ORDS add-to-cart           |

Persistence: `FAVORITE_TABLE` (1 per customer) + `PRODUCT_FAVORITE` (lines). For guests, kept in `FavoritesContext` in-memory only.

## Profile (`pages/customer/Profile.jsx`)

| Element             | Action                                                |
|---------------------|-------------------------------------------------------|
| Save profile        | `PATCH /api/me` (`name, phone, dob, address`)         |
| Change password     | (UI only — passwords are plaintext-shared with APEX)  |
| Logout              | `AuthContext.logout()` → `POST /api/logout`           |
| "Delete account"    | (optional — not wired in current code)                |

The PATCH only mutates the columns listed in `AuthController::updateMe`'s validator.
