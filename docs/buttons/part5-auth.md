# Part 5 — Auth Views

## Login (`pages/customer/Login.jsx`)

| Element              | Action                                                            |
|----------------------|-------------------------------------------------------------------|
| Login button         | `POST /api/oracle-login` with `{email,password,name,role}`        |
| Forgot password      | (UI only — not implemented; APEX side doesn't support it either)  |
| Signup link          | `navigate('/signup')`                                             |

`AuthController::login` upserts the `USER_TABLE` row, mints a Sanctum token, and returns `{token,user,role}`. The frontend stores the token in localStorage and configures axios.

> After login, call `mergeLocalCartToBackend(api)` from `utils/cart.js` to push any guest cart entries up.

## Signup (`pages/customer/Signup.jsx` and `pages/Signup.jsx`)

| Element        | Action                                                                |
|----------------|-----------------------------------------------------------------------|
| Create Account | Validates → `POST /api/oracle-login` with `role: 'Customer'`          |
| Login link     | `navigate('/login')`                                                  |

Signup currently uses the same `/oracle-login` endpoint with `updateOrCreate` semantics — first call creates, later calls update.

## Verify (`pages/Verify.jsx`)

| Element       | Action                                          |
|---------------|-------------------------------------------------|
| Resend email  | `POST /api/send-welcome-email`                  |
| Back to login | `navigate('/login')`                            |

Email confirmation is best-effort; the `CUSTOMER_TABLE.verified` flag is what actually governs purchasing capability.

## Logout

Anywhere the menu shows "Log out": `AuthContext.logout()` → `POST /api/logout` (Sanctum revokes current token) → clears local state → `navigate('/')`.

## TraderLogin (`pages/trader/TraderLogin.jsx`)

Functionally identical to customer Login, but the success branch routes
to `/trader` instead of `/`, and rejects users whose role is not `Trader`.
