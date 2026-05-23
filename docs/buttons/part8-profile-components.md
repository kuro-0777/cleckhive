# Part 8 — Profile & Reusable Components

## Contexts

### `context/AuthContext.jsx`

Exports `useAuth()` returning `{ user, token, login, logout, refresh }`.

- On mount: if `localStorage.token` present → `GET /api/me` to hydrate.
- `login({email,password,...})` → `POST /api/oracle-login` → stores token + user.
- `logout()` → `POST /api/logout` → clears local state.
- Wraps the app in `<AuthProvider>` at `resources/js/app.jsx`.

### `context/FavoritesContext.jsx`

Exports `useFavorites()` returning `{ favorites, toggle, isFavorite, refresh }`.

- For logged-in customers, persists via `PRODUCT_FAVORITE`.
- For guests, in-memory only (cleared on reload).

## Reusable components

| Component                      | Used for                                          |
|--------------------------------|---------------------------------------------------|
| `components/Navbar.jsx`        | Top nav with cart/favourites badges               |
| `components/Footer.jsx`        | Footer + legal links                              |
| `components/ToastProvider.jsx` | `useToast().notify({type,message})` — global toaster |
| `components/Modal.jsx`         | Generic centered modal (used by delete confirms)  |
| `components/Spinner.jsx`       | Loading spinner (lucide `Loader2`)                |

## Utils

| File                        | Exports                                                                 |
|-----------------------------|-------------------------------------------------------------------------|
| `utils/cart.js`             | `getLocalCart`, `addToLocalCart`, `updateLocalCartQty`, `removeFromLocalCart`, `clearLocalCart`, `localCartCount`, `localCartTotal`, `mergeLocalCartToBackend` |
| `utils/discountLogic.js`    | `shouldShowDiscount`, `calculateDiscountedPrice`                        |
| `api/axios.js`              | preconfigured axios with `Authorization` header interceptor             |
| `api/ords.js`               | direct ORDS clients + normalisers (see `10 — Direct ORDS Calls`)        |
| `api/image.js`              | `resolveImage(value)`                                                   |

## Profile (`pages/customer/Profile.jsx`)

Already covered in Part 4. Reuses:

- `AuthContext` for current user.
- `useToast` for success/error feedback.
- `axios` directly to `PATCH /api/me`.

## Trader / Admin layouts

Both have their own sidebar layouts that wrap nested page components
(`<TraderLayout>` and `<AdminLayout>`), and reuse the same `Navbar`/`Footer`
chrome where applicable.
