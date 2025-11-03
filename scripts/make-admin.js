#!/usr/bin/env node
import sqlite3pkg from 'sqlite3';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

function getArg(name, def = undefined) {
  const idx = process.argv.findIndex(a => a === `--${name}` || a.startsWith(`--${name}=`));
  if (idx === -1) return def;
  const arg = process.argv[idx];
  if (arg.includes('=')) return arg.split('=').slice(1).join('=');
  return process.argv[idx + 1] || def;
}

const email = getArg('email', 'admin@vr.local');
const password = getArg('password', 'admin123');
const dbUrl = process.env.DATABASE_URL || 'sqlite:./db.sqlite';
const dbFile = dbUrl.startsWith('sqlite:') ? dbUrl.replace('sqlite:', '') : './db.sqlite';

const sqlite3 = sqlite3pkg.verbose();
const db = new sqlite3.Database(dbFile);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

(async () => {
  try {
    console.log(`Using database: ${dbFile}`);
    const user = await get(`SELECT * FROM users WHERE email = ?`, [email]);
    if (!user) {
      const id = randomUUID();
      const hash = await bcrypt.hash(password, 10);
      await run(`INSERT INTO users (id, name, email, password, theater, avatar, is_verified, is_seller, is_admin, preferences) VALUES (?,?,?,?,?,?,?,?,?,?)`, [
        id,
        'Admin',
        email,
        hash,
        'VR Theatre',
        null,
        1,
        1,
        1,
        '{}'
      ]);
      console.log(`Created new admin user: ${email}`);
    } else {
      await run(`UPDATE users SET is_admin = 1, is_verified = COALESCE(is_verified, 0) | 1 WHERE id = ?`, [user.id]);
      console.log(`Promoted existing user to admin: ${email}`);
    }
    console.log('Done.');
  } catch (e) {
    console.error('Failed:', e.message || e);
    process.exit(1);
  } finally {
    db.close();
  }
})();
