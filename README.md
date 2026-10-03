# Apna Dhandha

Apna Dhandha is a multi-shop CRM for small businesses. Each shop has an isolated workspace for its team, inventory, quotations, and invoices.

## Features

- Shop owners can create a shop and Admin account after email OTP verification.
- Admins can invite team members with one-time links that expire after seven days.
- Admins manage shop users. Managers can manage Staff accounts; Staff use the operational workspace.
- Dashboard shows revenue, outstanding balances, estimated profit margin, low-stock items, and overdue invoices. Profit is a rough demo estimate using a fixed 65% cost assumption, not accounting data.
- Inventory supports search, stock/reorder tracking, low-stock alerts, and spreadsheet-compatible CSV export.
- Quotations and invoices support editable shop/customer details, line items, HSN/SAC, units, GST rates, dates, terms, and notes.
- Quotations can be converted to invoices. Invoices track payments, balances, and payment history.
- Invoices and quotations export as PDFs.
- Password recovery uses email OTP verification. In development, verification codes are shown in the app; production sends codes through SMTP.
- Shop data is isolated server-side in SQLite. Passwords are hashed, sessions use HTTP-only cookies, and authentication routes are rate-limited.

## Requirements

- Node.js 24 or later.
- npm.

## Run locally

```bash
npm install
npm run setup:auth
npm run dev
```

Open [http://localhost:5000](http://localhost:5000). The development API listens on port 3001 and Vite proxies API requests to it. Local development does not require SMTP; the app displays development OTP codes.

If `.env` already exists, `npm run setup:auth` leaves it unchanged. Keep `.env` private and never commit it.

## Tests and build

```bash
npm test
npm run build
```

`npm start` runs the `prestart` build and starts the production Node server on `PORT` (default 5000). The readiness endpoint is `/api/health`.

## Production setup

Production requires a persistent disk for SQLite, a single app instance, HTTPS, and configured SMTP. Set `NODE_ENV=production`, `SESSION_SECRET`, `APP_ORIGIN`, `AUTH_DATABASE_PATH`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, and either `SMTP_FROM` or `SMTP_USER` with `SMTP_PASS` in your host's secret manager. The server verifies SMTP before listening and does not expose OTPs in production responses.

See [DEPLOYMENT.md](DEPLOYMENT.md) for environment details, database backup guidance, and the legacy database migration notes. Back up an existing database before its first start on the tenant-aware build.
