// GET /api/sales-data
// Returns the JMS sales dashboard JSON -- but ONLY if the request carries
// a valid session cookie from /api/login. Unauthenticated requests get a
// 401 with no data at all. This is the piece the old static HTML could
// never do: the browser cannot see this JSON until it has proven it knows
// the password.

const fs = require('fs');
const path = require('path');
const { isAuthed } = require('./_auth');

module.exports = async (req, res) => {
  if (!isAuthed(req)) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const dataPath = path.join(process.cwd(), 'data', 'sales-data.json');
  const raw = fs.readFileSync(dataPath, 'utf8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(raw);
};
