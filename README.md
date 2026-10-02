# Apna Dhandha

A React single-page business app built with Vite. The active app provides a dashboard, inventory, quotations, invoices, and a persisted team directory. Quote and invoice items can autofill from inventory by SKU, with manual entry for unmatched products and editable GST rates.

## Run Locally

```bash
npm install
Copy-Item .env.example .env
npm run dev
```

Before starting, set independent random values for `SESSION_SECRET` and
`BOOTSTRAP_ADMIN_TOKEN` in `.env`. Generate a value with:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Use `APP_ORIGIN=http://localhost:5000` locally. On Replit, configure the same
variables as Secrets and set `APP_ORIGIN` to the deployed HTTPS origin. The
first visit asks for the bootstrap token to create the initial Admin account.

The server stores password hashes, invitations, sessions, and shared business
collections in SQLite under `data/`. Keep that directory on persistent storage
in production. Admin-created invitations and password-reset links are one-time
links that must currently be shared manually; no email service is configured.

Run `npm run build` and `npm start` for production. Node 24 or newer is required.

## Source Structure

```text
src/
  App.jsx                  App shell, navigation, and shared business state
  main.jsx                 React entry point
  database.js              IndexedDB collection hook
  index.css                Tailwind and global styles
  components/
    Dashboard.jsx          Business summary and alerts
    Inventory.jsx          Inventory list, entry form, and export
    LineItemsEditor.jsx    Shared SKU lookup and manual line-item entry
    Quotation.jsx          Quote creation, export, and invoice conversion
    Invoice.jsx            Invoice creation, payment status, and export
    Team.jsx               Team directory, roles, and active status management
  utils/
    invoices.js            Shared invoice and line-item helpers
server/
  app.js                   Authenticated API and authorization checks
  database.js              SQLite schema and shared company data
  SQLiteSessionStore.js    Persistent HTTP session store
  index.js                 Production server
  dev.js                   API and Vite development servers
```

`ApnaDhandha-AllPhases-Complete.jsx` remains as a compatibility re-export; the maintained implementation lives under `src/`.
