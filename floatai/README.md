# Float AI website (float.pk)

A single-page, static site for Float AI. There is no build step and no server: just `index.html`, `styles.css`, `main.js` and `favicon.svg`.

## Edit

- **WhatsApp number and pre-filled message:** top of `main.js` (`WHATSAPP`, `WA_TEXT`). Every "Book a call" / "Talk to us" button uses them.
- **Email, phone, copy:** `index.html`.
- **Colours and fonts:** the tokens at the top of `styles.css` (`--accent` is the Float aqua).

## Preview locally

Open `index.html` in a browser, or run `npx serve floatai` from the repo root.

## Deploy on Vercel

1. In Vercel, **Add New → Project** and import this repo again (a second project, separate from the restaurant site).
2. Set **Root Directory** to `floatai`, Framework Preset **Other**, and leave the build settings empty.
3. Deploy, then add `float.pk` under **Settings → Domains**.
