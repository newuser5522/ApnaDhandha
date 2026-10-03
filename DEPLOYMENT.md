# Production Deployment

## Requirements

- Node.js 24 or later.
- One running application instance. SQLite and the in-memory rate limiter are intended for a single instance.
- A persistent volume for the SQLite database.
- An SMTP account for shop verification, invitations, and password recovery.

## Configure the host

Set these values in the deployment platform's secret/environment settings. Do not commit a real `.env` file.

- `NODE_ENV=production`
- `SESSION_SECRET`: at least 32 random characters; use a unique value per deployment.
- `APP_ORIGIN`: the exact public HTTPS origin, for example `https://crm.example.com`.
- `AUTH_DATABASE_PATH`: an absolute path on the persistent volume, for example `/data/apna-dhandha.sqlite`.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM`.
- `BOOTSTRAP_ADMIN_TOKEN`: optional; retained for the legacy first-admin bootstrap endpoint. Normal onboarding creates each shop through the verified sign-up form.

Use `SMTP_SECURE=true` for implicit TLS (commonly port 465) and `SMTP_SECURE=false` for STARTTLS (commonly port 587). Configure either `SMTP_FROM` or `SMTP_USER` as the sender address. The server verifies the SMTP connection before listening and refuses to start in production without a usable mail configuration.

## Build and start

The `prestart` script builds the client automatically when `npm start` runs. The server then serves the static app and API on `PORT` (default 5000). Configure the deployment health check to request `/api/health`.

## Data and backups

Keep the database file and its SQLite WAL files on the persistent volume. Do not commit files from `data/`. Back up with SQLite's online backup or `VACUUM INTO`; do not copy only the main database file while the app is running because recent committed data may still be in the WAL.

Before the first deployment of the tenant-aware build, take a consistent backup of the existing persistent database. The first startup runs an atomic migration that assigns existing users, invitations, and global collections to their legacy shop.

The startup migration assigns existing users and their existing global collections to a single legacy shop. Newly registered shops receive separate shop IDs, and users, invitations, and business collections are scoped to that ID. The previous browser-only data migration is available only to the migrated legacy shop.

## Onboarding

Shop owners can create a shop after verifying their email. Admins can invite Managers and Staff from Team. Managers can manage Staff only. Shop invitations are single-use and expire after seven days.
