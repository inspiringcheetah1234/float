/**
 * The Mountain Flame waitlist: receives sign-ups from the website and
 * appends them to this spreadsheet. Setup steps are in the README.
 */

// Must match SHEET_SECRET on the website. Pick any long random string.
const SECRET = 'change-me';
const SHEET_NAME = 'Waitlist';
const HEADERS = ['Signed up (PKT)', 'Name', 'Contact', 'Area', 'Most excited about'];
const EXCITED_LABELS = { dumba: 'Dumba', mutton_karahi: 'Mutton Karahi', both: 'Both' };

function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return json({ status: 'error', message: 'Invalid JSON' });
  }
  if (data.secret !== SECRET) return json({ status: 'error', message: 'Unauthorized' });

  // Serialise writes so two sign-ups at once can't both pass the duplicate check.
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheet();
    const contact = String(data.contact);
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const contacts = sheet.getRange(2, 3, lastRow - 1, 1).getDisplayValues().flat();
      if (contacts.includes(contact)) return json({ status: 'duplicate' });
    }

    const timestamp = Utilities.formatDate(new Date(), 'Asia/Karachi', 'yyyy-MM-dd HH:mm');
    // Prefix text so Sheets keeps leading zeros and never runs a value as a formula.
    sheet.appendRow([
      timestamp,
      safe(data.name),
      "'" + contact,
      safe(data.area),
      EXCITED_LABELS[data.excitedFor] || safe(data.excitedFor),
    ]);
    return json({ status: 'ok' });
  } finally {
    lock.releaseLock();
  }
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function safe(value) {
  const s = String(value == null ? '' : value);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
