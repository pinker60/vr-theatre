import * as schema from "../shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Export a mutable binding so we can initialize it after dynamic imports
export let db: any;

if (process.env.DATABASE_URL.startsWith('sqlite:')) {
  // Use sqlite3 + drizzle sqlite3 adapter for local development
  // DATABASE_URL expected format: sqlite:./db.sqlite
  const sqlite3mod = await import('sqlite3').catch(() => null);
  const sqlite3 = (sqlite3mod && (sqlite3mod.default || sqlite3mod)) as any;
  const { Database } = sqlite3 || {};
  if (!Database) {
    throw new Error('SQLite adapter requested but sqlite3 package is not available. Please run: npm install sqlite3 --legacy-peer-deps');
  }

  const drizzleModule = await import('drizzle-orm/sqlite3');
  const drizzle = (drizzleModule && drizzleModule.drizzle) || drizzleModule.default || drizzleModule;
  const dbFile = process.env.DATABASE_URL.replace('sqlite:', '') || './db.sqlite';
  const sqlite = new Database(dbFile);
  db = drizzle(sqlite, { schema });
} else {
  // Default: Neon/Postgres serverless
  const neonMod = await import('@neondatabase/serverless');
  const drizzleMod = await import('drizzle-orm/neon-serverless');
  const wsMod = await import('ws');
  const { Pool, neonConfig } = neonMod as any;
  const drizzle = (drizzleMod && (drizzleMod.drizzle || drizzleMod.default)) as any;
  const ws = (wsMod && (wsMod.default || wsMod)) as any;
  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle({ client: pool, schema });
}
