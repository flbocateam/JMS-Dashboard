// GET /api/transfer-data
// Same pattern as sales-data.js: returns the Jack/Mark transfer tracker
// JSON only to requests carrying a valid session cookie.

const fs = require('fs');
const path = require('path');
const { isAuthed } = require('./_auth');

module.exports = async (req, res) => {
  if (!isAuthed(req)) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const dataPath = path.join(process.cwd(), 'data', 'transfer-data.json');
  const raw = fs.readFileSync(dataPath, 'utf8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(raw);
};
