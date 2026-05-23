# 06 — Middleware & Authentication

## Two systems, one user table

`USER_TABLE` is shared by two completely separate auth stacks:

1. **Laravel + Sanctum** — for the React frontend.
2. **APEX `custom_auth` PL/SQL function** — for the admin app at `/ords/r/.../cleckhive`.

Both must agree on the same `(email, password)` row.

## Why passwords are stored plaintext

`custom_auth` runs in Oracle and does:
```sql
SELECT COUNT(*) FROM User_Table
WHERE LOWER(TRIM(Email)) = LOWER(TRIM(p_username))
  AND Password = TRIM(p_password);
```
There is no bcrypt verifier in PL/SQL. To keep one source of truth, the
Laravel side does **not** call `Hash::make()` — `AuthController::login`
stores the password verbatim. Insecure for production; fine for a
university project.

## Sanctum

`config/sanctum.php` is default. `User extends Authenticatable` and uses
`HasApiTokens`. Tokens are minted in `AuthController::login`:

```php
$user->tokens()->delete();
$token = $user->createToken('auth_token')->plainTextToken;
```

React stores the token (axios interceptor) and sends it as
`Authorization: Bearer …` on every authenticated call.

## EnsureRole middleware

`app/Http/Middleware/EnsureRole.php`:

```php
public function handle(Request $request, Closure $next, string ...$roles): Response
{
    $user = $request->user();
    if (!$user) return response()->json(['success'=>false,'message'=>'Unauthenticated.'], 401);
    if (!in_array($user->role, $roles, true)) {
        return response()->json(['success'=>false,'message'=>'Forbidden. Required role: '.implode('|',$roles)], 403);
    }
    return $next($request);
}
```

Registered as alias `role` in `bootstrap/app.php` and applied per-group in `api.php`:

```php
Route::middleware('role:customer')->group(function () { … });
Route::middleware('role:trader')  ->group(function () { … });
Route::middleware('role:admin')   ->group(function () { … });
```

Roles use **PascalCase** in the database. The middleware uses strict `===`
comparison, so the AuthController normalises input via `normalizeRole()`.

## APEX authorisation schemes

Defined in `Cleckhiveapp.sql`:

| Scheme            | Logic                                                  |
|-------------------|--------------------------------------------------------|
| `Admin`           | `EXISTS (SELECT 1 FROM User_Table WHERE LOWER(email)=LOWER(:APP_USER) AND Role='Admin')` |
| `IS_ADMIN`        | function body, returns `Role = 'Admin'`                |
| `IS_TRADER`       | function body, returns `Role = 'Trader'`               |
| `ADMIN_OR_TRADER` | function body, returns `Role IN ('Admin','Trader')`    |
| `CUSTOMER_OR_ADMIN` | function body, returns `Role IN ('Customer','Admin')` |

> **Historic bug**: the `Admin` scheme previously compared `Role = upper('Admin')` → `'ADMIN'`, which never matches the PascalCase stored value. Patched in current `Cleckhiveapp.sql`.

## set_user_session

Called by the APEX login page's `AFTER_SUBMIT` process. Populates `:APP_USER_ROLE` and `:APP_USER_ID`:

```sql
CREATE OR REPLACE PROCEDURE set_user_session IS …
BEGIN
  SELECT Role, User_id INTO v_role, v_user_id
  FROM User_Table WHERE LOWER(Email) = LOWER(v('APP_USER'));
  APEX_UTIL.SET_SESSION_STATE('APP_USER_ROLE', v_role);
  APEX_UTIL.SET_SESSION_STATE('APP_USER_ID',   v_user_id);
END;
```

Created by the Laravel migration so it always exists when APEX needs it.

## Seeded admin

`UserSeeder` creates `admin@cleckhive.test` / password `admin123` (plaintext).
Use that to log in to the APEX admin app.
