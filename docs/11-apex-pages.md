# 11 — Oracle APEX Backend

The admin app lives in `Cleckhiveapp.sql` (an export). Import it into
APEX 26 against the **TEAM16** schema. URL pattern after import:
`http://localhost:8080/ords/r/teamproject/cleckhive`.

## Login flow

1. User lands on page 9999 (`Login`).
2. Hits `custom_auth(:P9999_USERNAME, :P9999_PASSWORD)` — plaintext compare against `USER_TABLE.Password`.
3. AFTER_SUBMIT process `Set User Session` calls `set_user_session;`
   which sets `:APP_USER_ROLE` + `:APP_USER_ID`.
4. AFTER_SUBMIT process `Set Username Cookie` calls
   `APEX_AUTHENTICATION.SEND_LOGIN_USERNAME_COOKIE`.

Both `custom_auth` and `set_user_session` are created by the Laravel
migration (`2026_05_21_000100_create_oracle_sequences_and_triggers.php`).

## Authentication scheme

Static ID `custom-auth`, type `NATIVE_CUSTOM`, points at the `custom_auth`
function. There's also a stale `Database Accounts` scheme that uses
`custom_auth_function` — leave it disabled.

## Authorisation schemes (Shared Components → Security)

| Static ID                | Logic                                                           |
|--------------------------|-----------------------------------------------------------------|
| `admin`                  | `EXISTS … Role = 'Admin'` (now PascalCase, was buggy)           |
| `is-admin`               | function returns `Role = 'Admin'`                               |
| `is-trader`              | function returns `Role = 'Trader'`                              |
| `admin-or-trader`        | function returns `Role IN ('Admin','Trader')`                   |
| `customer-or-admin`      | function returns `Role IN ('Customer','Admin')`                 |
| `administration-rights`  | `return true` (legacy / always allow)                           |

## Key pages

| Page  | Alias             | Notes                                                                                |
|-------|-------------------|--------------------------------------------------------------------------------------|
| 1     | `HOME`            | Admin Portal landing. Uses `:APP_USER_ROLE = 'Admin'` to render admin-only widgets.  |
| 9999  | `LOGIN`           | Login form; calls `custom_auth`, then `set_user_session`.                            |
| (report) | —              | Admin sales report. `P1_TARGET_DATE` defaults via `SELECT to_char(sysdate,'YYYY-MM-DD') FROM dual` — `FROM dual` is mandatory or ORA-00923.|
| (CRUD) | Traders/Products  | Bound to AutoREST-exposed tables; updates go straight to TEAM16.                     |

## Things that historically broke

1. **`Admin` scheme** compared `ROLE = upper('Admin')` → `'ADMIN'`. Never matched.
   Fixed by comparing `Role = 'Admin'`.
2. **`P1_TARGET_DATE` default** was `SELECT to_char(sysdate,'YYYY-MM-DD')` with no
   `FROM dual` → `ORA-00923: FROM keyword not found where expected`.
3. **`set_user_session` missing** when migrations didn't include it. Now created
   from the Laravel migration so it's always present.
4. **Password mismatch** between bcrypt (Laravel) and plaintext (APEX). Both sides
   now use plaintext for the same `USER_TABLE.Password` column.

## Importing

In APEX:

1. App Builder → Import.
2. Pick `Cleckhiveapp.sql`.
3. Install into **TEAM16** workspace.
4. After install, confirm both the `Custom Auth` scheme and the
   `set_user_session` PL/SQL procedure exist (the migration creates the
   latter — run it first).

## Useful SQL checks

```sql
-- Are the auth bits in place?
SELECT object_name, object_type
FROM   user_objects
WHERE  object_name IN ('CUSTOM_AUTH','SET_USER_SESSION');

-- All triggers from the migration:
SELECT trigger_name, status FROM user_triggers ORDER BY trigger_name;

-- Sequences:
SELECT sequence_name, last_number FROM user_sequences ORDER BY sequence_name;
```
