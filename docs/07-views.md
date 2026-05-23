# 07 — Views & Pages

Laravel only serves a Blade shell (`resources/views/app.blade.php`); the
real UI is React under `resources/js/pages/`. React Router maps URLs to
those components.

## Customer pages (`pages/customer/`)

| File             | Route        | Purpose                                            |
|------------------|--------------|----------------------------------------------------|
| `Home.jsx`       | `/`          | Hero + featured products + categories              |
| `CategoryPage.jsx`| `/category/:name` | Browse products in a category                  |
| `ProductPage.jsx`| `/product/:id` | Product detail, qty picker, reviews, add-to-cart |
| `Cart.jsx`       | `/cart`      | Cart view, guest cart fallback via localStorage    |
| `Checkout.jsx`   | `/checkout`  | Choose slot, PayPal flow                           |
| `Invoice.jsx`    | `/invoice/:id`| Post-order receipt                                |
| `Favorites.jsx`  | `/favorites` | Wishlist                                           |
| `Profile.jsx`    | `/profile`   | Edit name/phone/DOB/address                        |
| `Login.jsx`      | `/login`     | Email/password login                               |
| `Signup.jsx`     | `/signup`    | Register new customer                              |
| `About.jsx`      | `/about`     | Static marketing page                              |
| `Contact.jsx`    | `/contact`   | Contact-us form → `POST /api/contact`              |
| `Terms.jsx`      | `/terms`     | Static legal page                                  |

## Trader pages (`pages/trader/`)

| File                       | Route                        | Purpose                          |
|----------------------------|------------------------------|----------------------------------|
| `TraderLogin.jsx`          | `/trader/login`              | Trader login                     |
| `TraderDashboard.jsx`      | `/trader`                    | Stats overview                   |
| `TraderViewProducts.jsx`   | `/trader/products`           | Trader's product list            |
| `TraderAddProduct.jsx`     | `/trader/products/new`       | New product form (uploads image) |
| `TraderUpdateProduct.jsx`  | `/trader/products/:id/edit`  | Edit product                     |
| `TraderDeleteProduct.jsx`  | (inline confirm)             | Delete confirm modal             |
| `TraderDiscounts.jsx`      | `/trader/discounts`          | Create/clear shop-wide discount  |
| `TraderProfile.jsx`        | `/trader/profile`            | Trader profile                   |
| `TraderAddress.jsx`        | `/trader/address`            | Shop address management          |
| `TraderAnalytics.jsx`      | `/trader/analytics`          | Charts                           |
| `TraderReport.jsx`         | `/trader/report`             | Sales report                     |
| `TraderReceipt.jsx`        | `/trader/receipt/:id`        | Print-friendly order receipt     |

## Admin pages (`pages/admin/`)

| File                        | Route                       | Purpose                          |
|-----------------------------|-----------------------------|----------------------------------|
| `AdminDashboard.jsx`        | `/admin`                    | KPIs + recent activity           |
| `AdminCustomers.jsx`        | `/admin/customers`          | Customer list + verify           |
| `AdminManageTraders.jsx`    | `/admin/traders`            | Verify/suspend traders           |
| `AdminAddTrader.jsx`        | `/admin/traders/new`        | Onboard a trader                 |
| `AdminManageProducts.jsx`   | `/admin/products`           | Global product list              |
| `AdminManageOrders.jsx`     | `/admin/orders`             | Order overview, status, refunds  |
| `AdminCollectionSlots.jsx`  | `/admin/slots`              | Create + monitor market slots    |
| `AdminReport.jsx`           | `/admin/report`             | Daily/weekly/monthly sales       |

## Shared infrastructure

- `components/Navbar.jsx`, `components/Footer.jsx` — chrome.
- `components/ToastProvider.jsx` — `useToast().notify({ type, message })`.
- `context/AuthContext.jsx` — wraps `useAuth()`. Stores token + user, hydrates from `/me` on mount.
- `context/FavoritesContext.jsx` — wishlist state.
- `api/axios.js` — base axios with token interceptor.
- `api/ords.js` — direct ORDS calls (see `10`).
