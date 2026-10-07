// Local / non-Vercel server: serves the static site and the sign-up API.
const path = require('node:path');
const express = require('express');
const waitlist = require('./api/waitlist');

const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));
app.all('/api/waitlist', waitlist);

app.listen(PORT, () => {
  console.log(`Waitlist running at http://localhost:${PORT}`);
});
