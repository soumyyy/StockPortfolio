# Stock Portfolio Tracker

A Vercel-hosted Next.js app that pulls holdings/positions from multiple Zerodha Kite accounts, stores the snapshots in Postgres (Supabase, Vercel Postgres, etc.), and overlays the latest market prices from Yahoo Finance. You only need to log in to Kite when you want to refresh the snapshots; the dashboard keeps showing your last synced quantities with live quotes in between.

## Key Features

- 🔐 **Secure multi-account auth** – `/api/kite/login` and `/api/kite/callback` implement the official Kite OAuth flow for each configured account with CSRF/state protection.
- 🗃️ **Durable snapshots** – Kite responses are encrypted, stored in Edge Config during the session, and persisted in Postgres (`portfolio_snapshots` + `sync_status`). The UI reads from the DB, so it keeps working even when the daily Kite token expires.
- 📡 **On-demand syncing** – Hit “Sync from Zerodha” (or `/api/kite/sync`) whenever you make trades. If the stored token is stale, you’ll be redirected to Kite to re-authenticate; otherwise it refreshes silently.
- 💹 **Live mark-to-market** – `/api/portfolio` decorates the stored quantities with fresh Yahoo Finance quotes, so P&L stays current without contacting Kite.
- 📊 **Combined & per-account views** – All holdings roll up into one portfolio summary, while per-account cards show last synced time, errors, and sync buttons.

## Architecture Overview

```
Kite OAuth  ──► /api/kite/login ─► /api/kite/callback ──► syncAccountSnapshot()
   ▲                                                 │
   │                                                 └── saves holdings/positions → Postgres (Supabase)
   └── browser redirect                             

Client ──► /api/portfolio ──► Postgres snapshots ──► Yahoo Finance quotes
                                        │
                                        └── merge holdings + positions (multi-account)
```

- Tokens never reach the client; they’re encrypted with `TOKEN_ENCRYPTION_KEY` and stored in Vercel Edge Config (`kite_tokens` key).
- `/api/kite/sync?account=<id>` lets you re-sync using the stored token; if Kite rejects it, the route returns `reauthRequired: true` so the UI can send you through `/api/kite/login`.
- `/api/portfolio` emits:

  ```ts
  {
    combined: { holdings, positions, fetchedAt },  // merged view with latest quotes
    accounts: [
      {
        accountId,
        accountLabel,
        holdings,
        positions,
        lastSyncedAt,
        needsSync,
        syncError
      }
    ],
    errors: []
  }
  ```

## Environment Variables

Populate `.env.local` (dev) and the Vercel project settings with:

| Variable | Description |
| --- | --- |
| `APP_URL` | Base URL (`http://127.0.0.1:3000` locally, `https://<your-domain>` in prod). |
| `EDGE_CONFIG_ID` | Edge Config store ID used to persist encrypted tokens. |
| `VERCEL_ACCESS_TOKEN` | Personal token with write access to that Edge Config. |
| `TOKEN_ENCRYPTION_KEY` | 32+ char secret used for AES‑256‑GCM. |
| `DATABASE_URL` | Postgres connection string (Supabase, Vercel Postgres, Neon, etc.). |
| `KITE_ACCOUNT_IDS` | Comma-separated IDs (`self,mom`). |
| `KITE_API_KEY_<ID>` / `KITE_API_SECRET_<ID>` | API key/secret for each account (suffix is uppercase, e.g., `KITE_API_KEY_SELF`). |
| `KITE_ACCOUNT_<ID>_LABEL` | Optional display name for UI buttons. |

## Database Setup

Any Postgres works. For Supabase:

1. Create a Supabase project (free tier works).
2. Copy the “connection string” from Settings → Database.
3. Paste it into `DATABASE_URL` (local + Vercel).
4. Run the initial schema:

   ```bash
   psql "$DATABASE_URL" -f db/migrations/001_init.sql
   ```

This creates:

- `portfolio_snapshots (account_id, holdings_json, positions_json, fetched_at)`
- `sync_status (account_id, last_sync_at, last_error, last_error_at)`

## Kite Connect Setup

Because Kite allows one redirect URL per app, create a separate Kite Connect app per user (and per environment if needed).

1. Log into [https://developers.kite.trade](https://developers.kite.trade).
2. Create an app with redirect URL `https://<APP_URL>/api/kite/callback` (switch to `http://127.0.0.1:3000/api/kite/callback` during local testing).
3. Copy the API key/secret into the matching env vars (`KITE_API_KEY_SELF`, etc.).
4. Repeat for additional accounts (`mom`, etc.).

When you want to refresh holdings, either:

- Click “Sync from Zerodha” (calls `/api/kite/sync`). If the stored token is valid it will refresh silently; otherwise the API responds `reauthRequired=true` and the UI redirects you to `/api/kite/login`.
- Or go directly to `/api/kite/login?account=<id>` to re-authenticate. The callback automatically fetches holdings/positions and writes a snapshot.

## Running Locally

```bash
cp .env.example .env.local
# fill in APP_URL, TOKEN_ENCRYPTION_KEY, DATABASE_URL, Kite keys, etc.
npm install
npm run dev
```

1. Make sure the DB schema exists (`psql "$DATABASE_URL" -f db/migrations/001_init.sql`).
2. Visit [http://127.0.0.1:3000](http://127.0.0.1:3000).
3. Use “Sync from Zerodha” to load the first snapshot for each account. After that the dashboard uses the stored data + live quotes, so daily Kite logins are optional until you want to refresh.

## Deploying to Vercel

1. Provision Postgres (Supabase, Neon, etc.) and Edge Config; add all env vars to the Vercel project.
2. Run the migration against your production database.
3. Push the branch → Vercel build → deploy.
4. From the deployed URL, hit `/api/kite/login?account=<id>` once per account to seed the encrypted tokens + database snapshots.

## API Reference

| Route | Description |
| --- | --- |
| `GET /api/kite/login?account=<id>` | Starts Kite OAuth for an account, storing state in an HttpOnly cookie. |
| `GET /api/kite/callback` | Validates state, exchanges `request_token` for `access_token`, encrypts + stores it, and immediately refreshes the snapshot in Postgres. |
| `POST /api/kite/sync?account=<id>` | Attempts to sync using the stored access token. Returns `{ success: true }` on success, or `{ reauthRequired: true }` if the token expired. |
| `GET /api/portfolio` | Reads the latest snapshots from Postgres, fetches Yahoo quotes, merges multi-account holdings, and returns combined + per-account data. |

## Notes

- Tokens still expire daily (Kite policy), but because holdings live in Postgres you don’t need to log in unless you want to refresh quantities.
- Pull-to-refresh and 5-minute timers only call `/api/portfolio`, which hits Postgres + Yahoo, so they’re safe to run frequently.
- Extend `src/lib/kite.ts` / `src/lib/kiteSync.ts` if you want to store additional Kite data (orders, margins, etc.) in the same snapshot flow.

---

Happy investing!
