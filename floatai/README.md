# Float AI website (float.pk)

A single-page, static site for Float AI. There is no build step and no server: just `index.html`, `styles.css`, `main.js` and `favicon.svg`.

## Edit

- **WhatsApp number and pre-filled message:** top of `main.js` (`WHATSAPP`, `WA_TEXT`). Every "Book a call" / "Talk to us" button uses them.
- **Email, phone, copy:** `index.html`.
- **Colours and fonts:** the tokens at the top of `styles.css`. `--brand` is Float blue `#1E73BE` and `--brand-navy` is `#0F2A47` (both from the logo); `--accent` is a lighter blue for text and lines on the dark background. Headings use Montserrat to match the wordmark.
- **Logo:** `logo-white.png` (nav and footer), `favicon.svg`, and `og.png` (the preview image when the link is shared on WhatsApp or social media). The layers mark in the hero and favicon is redrawn as SVG from the logo.

## Preview locally

Open `index.html` in a browser, or run `npx serve floatai` from the repo root.

## Deploy on Vercel

1. In Vercel, **Add New → Project** and import this repo again (a second project, separate from the restaurant site).
2. Set **Root Directory** to `floatai`, Framework Preset **Other**, and leave the build settings empty.
3. Deploy, then add `float.pk` under **Settings → Domains**.
