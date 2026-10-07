const path = require('node:path');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');
const express = require('express');

const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

const EXCITED_OPTIONS = ['dumba', 'mutton_karahi', 'both'];

fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(path.join(DATA_DIR, 'waitlist.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS waitlist (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    contact     TEXT NOT NULL,
    area        TEXT NOT NULL,
    excited_for TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);
const insertEntry = db.prepare(
  'INSERT INTO waitlist (name, contact, area, excited_for) VALUES (?, ?, ?, ?)'
);
const findByContact = db.prepare('SELECT id FROM waitlist WHERE contact = ?');
const listEntries = db.prepare('SELECT * FROM waitlist ORDER BY created_at DESC');

const app = express();
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

function clean(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

app.post('/api/waitlist', (req, res) => {
  const name = clean(req.body.name, 100);
  const contact = clean(req.body.contact, 100);
  const area = clean(req.body.area, 150);
  const excitedFor = clean(req.body.excitedFor, 20);

  const errors = {};
  if (name.length < 2) errors.name = 'Please enter your name.';
  if (!/^\+?[\d\s-]{10,15}$/.test(contact)) errors.contact = 'Please enter a valid phone number.';
  if (area.length < 2) errors.area = 'Please enter your area of residence.';
  if (!EXCITED_OPTIONS.includes(excitedFor)) errors.excitedFor = 'Please pick one.';
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  const normalizedContact = contact.replace(/[\s-]/g, '');
  if (findByContact.get(normalizedContact)) {
    return res.status(409).json({ errors: { contact: "You're already on the waitlist!" } });
  }

  insertEntry.run(name, normalizedContact, area, excitedFor);
  res.status(201).json({ ok: true });
});

// Export sign-ups: GET /api/waitlist?token=ADMIN_TOKEN (add &format=csv for a spreadsheet).
app.get('/api/waitlist', (req, res) => {
  if (!ADMIN_TOKEN || req.query.token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const rows = listEntries.all();
  if (req.query.format !== 'csv') return res.json(rows);

  // Prefix formula-like values so spreadsheet apps don't execute them.
  const escape = (v) => `"${String(v).replace(/^([=\-@]|\+(?!\d))/, "'$&").replace(/"/g, '""')}"`;
  const header = ['id', 'name', 'contact', 'area', 'excited_for', 'created_at'];
  const csv = [header.join(',')]
    .concat(rows.map((r) => header.map((h) => escape(r[h])).join(',')))
    .join('\n');
  res.type('text/csv').attachment('waitlist.csv').send(csv);
});

app.listen(PORT, () => {
  console.log(`Waitlist running at http://localhost:${PORT}`);
});
