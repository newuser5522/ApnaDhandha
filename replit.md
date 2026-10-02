# Apna Dhandha Complete Edition

## Run the app

The project is a React app with a self-hosted Node API. The Replit workflow runs:

```bash
npm run dev
```

This starts the authentication API on port `3001` and Vite on port `5000`.
Vite proxies `/api` requests to the local API. Configure the secrets from
`.env.example` in Replit Secrets before first use.

## Build for production

```bash
npm run build
npm start
```

The production Node server serves the Vite build and authenticated API on the
same port. The SQLite database file is stored under `data/`; configure a
persistent Replit volume for production deployments.

## Project notes

- User credentials are hashed on the server and sessions use HTTP-only cookies.
- Initial administrator setup requires `BOOTSTRAP_ADMIN_TOKEN`.
- Team invitations are one-time links that expire after seven days; invite links
  must currently be shared manually.
