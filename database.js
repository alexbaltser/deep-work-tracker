const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, 'deepwork.db');
const db = new Database(dbPath);

// Create table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    start_time TEXT NOT NULL,
    end_time TEXT,
    duration INTEGER, -- duration in seconds
    note TEXT
  )
`);

module.exports = db;
