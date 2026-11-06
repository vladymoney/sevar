/* SEVAR — SQLite storage (node:sqlite, no native dependencies) */
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(path.join(DATA_DIR, 'sevar.db'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS inquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  source TEXT NOT NULL DEFAULT 'form',
  name TEXT NOT NULL DEFAULT '',
  company TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  product TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  page TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new',
  notes TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS quotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  number TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  inquiry_id INTEGER REFERENCES inquiries(id) ON DELETE SET NULL,
  customer TEXT NOT NULL DEFAULT '{}',
  items TEXT NOT NULL DEFAULT '[]',
  vat_rate REAL NOT NULL DEFAULT 20,
  discount_pct REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  valid_until TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft'
);
CREATE TABLE IF NOT EXISTS labels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  qty_options TEXT NOT NULL DEFAULT '[]',
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS label_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  number TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  items TEXT NOT NULL DEFAULT '[]',
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft'
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  number TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  type TEXT NOT NULL DEFAULT 'cart',
  customer TEXT NOT NULL DEFAULT '{}',
  items TEXT NOT NULL DEFAULT '[]',
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new',
  notes TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS b2b_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  number TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  company TEXT NOT NULL DEFAULT '',
  eik TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  items TEXT NOT NULL DEFAULT '[]',
  message TEXT NOT NULL DEFAULT '',
  frequency TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new',
  owner TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT ''
);
`);

/* shop checkout fields were added to orders later: add the columns to an existing database */
for (const col of ['delivery', 'payment', 'invoice', 'totals']) {
  try { db.exec(`ALTER TABLE orders ADD COLUMN ${col} TEXT NOT NULL DEFAULT '{}'`); } catch (_) { /* already there */ }
}
try { db.exec("ALTER TABLE orders ADD COLUMN tracking TEXT NOT NULL DEFAULT ''"); } catch (_) { /* already there */ }

/* first start: fill the label catalogue from the barcode table (server/labels-seed.json) */
if (db.prepare('SELECT COUNT(*) AS n FROM labels').get().n === 0) {
  try {
    const seed = JSON.parse(fs.readFileSync(path.join(__dirname, 'labels-seed.json'), 'utf8'));
    const ins = db.prepare('INSERT INTO labels (code, name, description, qty_options, active) VALUES (?,?,?,?,1)');
    db.exec('BEGIN');
    seed.forEach(l => ins.run(l.code, l.name, l.description || '', '[]'));
    db.exec('COMMIT');
  } catch (e) { console.warn('labels seed skipped:', e.message); }
}

/* next document number like ОФ-2026-0007 */
function nextNumber(table, prefix) {
  const year = new Date().getFullYear();
  const like = `${prefix}-${year}-%`;
  const row = db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE number LIKE ?`).get(like);
  let n = row.n + 1, num;
  do { num = `${prefix}-${year}-${String(n++).padStart(4, '0')}`; }
  while (db.prepare(`SELECT 1 FROM ${table} WHERE number = ?`).get(num));
  return num;
}

module.exports = { db, nextNumber, DATA_DIR };
