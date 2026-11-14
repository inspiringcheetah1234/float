# The Mountain Flame: waitlist landing page

A one-screen landing page (logo, **Join the Waitlist**, a button to the sign-up form, and Instagram / Find us links in the footer). Sign-ups are saved as rows in a Google Sheet.

```
public/                     the website (static HTML/CSS)
api/waitlist.js             POST /api/waitlist: validates a sign-up and sends it to the sheet
google-apps-script/Code.gs  script that lives in the Google Sheet and appends rows
server.js                   runs the site locally (or on any Node host)
```

## 1. Set up the Google Sheet (one time, ~5 minutes)

1. Create a new Google Sheet, e.g. "Mountain Flame Waitlist".
2. In the sheet, open **Extensions → Apps Script**.
3. Delete the starter code and paste in everything from `google-apps-script/Code.gs`.
4. Change `const SECRET = 'change-me';` to a long random string of your choice and **save**.
5. Click **Deploy → New deployment**, choose type **Web app**, and set:
   - **Execute as:** Me
   - **Who has access:** Anyone
6. Click **Deploy**, approve the permissions prompt, and copy the **Web app URL** (it ends in `/exec`).

The first sign-up creates a **Waitlist** tab with these columns: Signed up (Pakistan time), Name, Contact, Area, Most excited about. Phone numbers that are already on the list are rejected.

> If you edit `Code.gs` later, redeploy with **Deploy → Manage deployments → Edit → Version: New version**, or the old code keeps running.

## 2. Deploy the site

### Vercel

1. Import this repo into Vercel (no build settings needed; `vercel.json` handles it).
2. Under **Settings → Environment Variables**, add:
   - `SHEET_WEBHOOK_URL`: the Web app URL from step 6
   - `SHEET_SECRET`: the same secret you put in `Code.gs`
3. Redeploy.

### Locally or on any Node host

Requires Node 22.9+.

```bash
npm install
cp .env.example .env   # then fill in SHEET_WEBHOOK_URL and SHEET_SECRET
npm start              # http://localhost:3000
```

## Main website (`/home`)

`public/home.html` is the full restaurant site: the menu, a cart, and checkout for **delivery**, **pickup** or **booking a table** (with an optional pre-order). Checkout sends nothing to a server: it opens WhatsApp with the order, contact details and booking already written out, and the customer taps send.

- **WhatsApp number, address, hours, booking times:** `public/config.js`. Set `whatsapp` to the number that should receive orders (digits only, with country code, e.g. `923001234567`).
- **Menu and prices:** `public/menu-data.js`, copied from the printed menu card (21 October version).
- The waitlist stays at `/` for now. To launch the main site, rename `public/index.html` to `public/waitlist.html` and `public/home.html` to `public/index.html`.

## Customise

- **Brand:** colours follow the brand guidelines (Ember Maroon `#531117`, Warm Parchment `#CDC0AA`). The display face Giliran isn't on Google Fonts, so Cinzel stands in. To use Giliran, add its font files to `public/` and point `--display` in `styles.css` at it.
- **Logo:** `public/logo.png` is the full lockup; `public/brandmark.png` is the mountain-and-flame mark (used on the form and as the faint background flame); `public/favicon.png` is the tab icon.
- **Instagram / Google Maps links:** edit `public/config.js`.
