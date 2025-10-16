const sqlite3 = require('sqlite3').verbose();
const dbFile = './db.sqlite';
const db = new sqlite3.Database(dbFile);

db.serialize(() => {
  db.run("ALTER TABLE users ADD COLUMN verification_token TEXT", (err) => {
    if (err) console.log('alter verification_token:', err.message);
    else console.log('verification_token column added');
  });
  db.run("ALTER TABLE users ADD COLUMN verification_expires DATETIME", (err) => {
    if (err) console.log('alter verification_expires:', err.message);
    else console.log('verification_expires column added');
  });
  db.run("CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users (verification_token)", (err) => {
    if (err) console.log('create index:', err.message);
    else console.log('index created');
  });
});

db.close();
