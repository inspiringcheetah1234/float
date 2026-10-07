// POST /api/waitlist: validates a sign-up and appends it to the Google Sheet
// via the Apps Script web app in google-apps-script/Code.gs.
// Runs as a Vercel serverless function and is also mounted by server.js.

const EXCITED_OPTIONS = ['dumba', 'mutton_karahi', 'both'];

function clean(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { SHEET_WEBHOOK_URL, SHEET_SECRET } = process.env;
  if (!SHEET_WEBHOOK_URL || !SHEET_SECRET) {
    console.error('SHEET_WEBHOOK_URL and SHEET_SECRET must be set');
    return res.status(500).json({ errors: { form: 'Sign-ups are not configured yet. Please try again later.' } });
  }

  const body = req.body || {};
  const name = clean(body.name, 100);
  const contact = clean(body.contact, 100);
  const area = clean(body.area, 150);
  const excitedFor = clean(body.excitedFor, 20);

  const errors = {};
  if (name.length < 2) errors.name = 'Please enter your name.';
  if (!/^\+?[\d\s-]{10,15}$/.test(contact)) errors.contact = 'Please enter a valid phone number.';
  if (area.length < 2) errors.area = 'Please enter your area of residence.';
  if (!EXCITED_OPTIONS.includes(excitedFor)) errors.excitedFor = 'Please pick one.';
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  try {
    const sheetRes = await fetch(SHEET_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        secret: SHEET_SECRET,
        name,
        contact: contact.replace(/[\s-]/g, ''),
        area,
        excitedFor,
      }),
    });
    const result = await sheetRes.json();

    if (result.status === 'duplicate') {
      return res.status(409).json({ errors: { contact: "You're already on the waitlist!" } });
    }
    if (result.status !== 'ok') throw new Error(`Sheet responded: ${JSON.stringify(result)}`);
    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error('Failed to save sign-up:', err);
    return res.status(502).json({ errors: { form: 'Something went wrong. Please try again.' } });
  }
};
