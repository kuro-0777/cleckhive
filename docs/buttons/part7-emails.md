# Part 7 — Email Templates

The Laravel app exposes a single email endpoint today:

| Method | URL                       | Trigger                                                  |
|--------|---------------------------|----------------------------------------------------------|
| POST   | `/api/send-welcome-email` | After signup, frontend posts `{email,name}` to the closure in `routes/api.php`. |

## What it does

Sends a "Welcome to CleckHive" mail via Laravel's `Mail` facade
(`MAIL_MAILER`, `MAIL_FROM_ADDRESS`, … in `.env`). Bodies live in
`resources/views/emails/` (Blade templates) if/when added.

## Suggested mailers (not yet wired)

| Event                | Suggested template            | Trigger location                        |
|----------------------|-------------------------------|-----------------------------------------|
| Welcome              | `emails/welcome.blade.php`    | `POST /api/send-welcome-email` (live)   |
| Order confirmation   | `emails/order-confirmed.blade.php` | `OrderController::store` after success |
| Payment received     | `emails/payment-received.blade.php`| `PaymentController::captureAndComplete`|
| Order ready to collect| `emails/ready-for-pickup.blade.php`| Trader marks status via `PATCH /api/orders/{id}/status`|
| Password reset       | not implemented               | —                                       |

## Mail config

```env
MAIL_MAILER=smtp                 # or 'log' for dev
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=…
MAIL_PASSWORD=…
MAIL_FROM_ADDRESS=no-reply@cleckhive.test
MAIL_FROM_NAME=CleckHive
```

Use Mailtrap (or `MAIL_MAILER=log` writing into `storage/logs/laravel.log`) for development.
