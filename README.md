# Waitlist landing page

A one-screen landing page (logo, **Join the Waitlist**, a button to the sign-up form, and Instagram / Find us links in the footer) with a small Node backend that stores sign-ups in SQLite.

## Run it

Requires Node 22.13+.

```bash
npm install
ADMIN_TOKEN=pick-a-secret npm start
# open http://localhost:3000
```

| Env var       | Default   | Purpose                                          |
|---------------|-----------|--------------------------------------------------|
| `PORT`        | `3000`    | Port to listen on                                |
| `DATA_DIR`    | `./data`  | Where `waitlist.db` is stored (keep it on a persistent disk) |
| `ADMIN_TOKEN` | *(empty)* | Required to view or export sign-ups              |

## Customise

- **Logo:** replace `public/logo.svg` (the current one is a placeholder mountain-and-flames mark). To use a PNG, drop it in `public/` and update the `src` in `index.html` and `join.html`.
- **Instagram / Google Maps links:** edit `public/config.js`.

## Viewing sign-ups

Each sign-up stores name, contact number, area of residence, what they're most excited about (`dumba`, `mutton_karahi` or `both`), and a timestamp. Duplicate phone numbers are rejected.

- JSON: `http://localhost:3000/api/waitlist?token=YOUR_ADMIN_TOKEN`
- CSV (opens in Excel / Google Sheets): `http://localhost:3000/api/waitlist?token=YOUR_ADMIN_TOKEN&format=csv`

## Hosting note

The database is a file on disk, so host it somewhere with a persistent disk (a VPS, Railway or Render with a volume, etc.). Serverless hosts such as Vercel or Netlify wipe local files between requests, so sign-ups would be lost there.
