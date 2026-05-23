# Part 1 — Layouts & Static Pages

## Navbar (`components/Navbar.jsx`)

| Element              | Action                                                |
|----------------------|-------------------------------------------------------|
| Logo                 | `navigate('/')`                                       |
| Shop                 | `navigate('/products')`                               |
| Categories dropdown  | `navigate('/category/<name>')`                        |
| Cart icon            | `navigate('/cart')` — badge from local + remote cart  |
| Heart icon           | `navigate('/favorites')`                              |
| User menu → Profile  | `navigate('/profile')` (auth required)                |
| User menu → Orders   | `navigate('/orders')`                                 |
| User menu → Logout   | `AuthContext.logout()` → `POST /api/logout`           |
| Login button         | `navigate('/login')` (when no user)                   |

## Footer (`components/Footer.jsx`)

All footer items are `<Link>`s to:
- `/about`, `/contact`, `/terms`
- Trader portal: `/trader/login`
- Admin: not linked publicly

## About (`pages/customer/About.jsx`)

Static. Single CTA "Browse Products" → `navigate('/products')`.

## Terms (`pages/customer/Terms.jsx`)

Pure content. No interactive elements.

## Contact (`pages/customer/Contact.jsx`)

| Element        | Action                                                             |
|----------------|--------------------------------------------------------------------|
| Submit button  | `POST /api/contact` with `{name,email,subject,message}` → toast    |

`ContactController@store` writes a row to `contact_messages` (Laravel-managed table).
