import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs';

// Use sqlite3 directly for local development storage
import sqlite3 from 'sqlite3';

// Minimal local types to satisfy TypeScript (mirror of shared/schema types)
export type User = any;
export type InsertUser = any;
export type Content = any;
export type InsertContent = any;

// Storage interface - defines all CRUD operations
export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByStripeId(stripeId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, userData: Partial<User>): Promise<User>;
  
  // Contents
  getContents(params: {
    page?: number;
    limit?: number;
    tag?: string;
    sortBy?: string;
    sellerId?: string;
  }): Promise<{ contents: Content[]; total: number; hasMore: boolean }>;
  getContentById(id: string): Promise<Content | undefined>;
  createContent(content: InsertContent): Promise<Content>;
  updateContent(id: string, data: Partial<Content>): Promise<Content>;
  deleteContent(id: string): Promise<void>;
  
  // Stripe
  updateUserStripeInfo(userId: string, stripeId: string, isSeller: boolean): Promise<User>;
}
// We'll implement a lightweight sqlite-backed storage to satisfy the API used by routes
class SqliteStorage implements IStorage {
  private db: sqlite3.Database;

  constructor(dbFile: string) {
    const dir = path.dirname(dbFile);
    if (!fs.existsSync(dir) && dir !== '.') fs.mkdirSync(dir, { recursive: true });
    this.db = new sqlite3.Database(dbFile);
    this.migrate();
  }

  private run(sql: string, params: any[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err: any) {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  private get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err: any, row: T) => {
        if (err) return reject(err);
        resolve(row as T | undefined);
      });
    });
  }

  private all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err: any, rows: T[]) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });
  }

  private async migrate() {
    // Create tables if they don't exist
    await this.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        theater TEXT,
        avatar TEXT,
        is_verified INTEGER DEFAULT 0,
        verification_token TEXT,
        verification_expires DATETIME,
        is_seller INTEGER DEFAULT 0,
        is_admin INTEGER DEFAULT 0,
        stripe_id TEXT,
        preferences TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT (datetime('now'))
      )
    `);
    // Ensure new columns exist for existing DBs - add if missing
    try {
      await this.run(`ALTER TABLE users ADD COLUMN verification_token TEXT`);
    } catch (e) {
      // ignore if column already exists or ALTER not supported
    }
    try {
      await this.run(`ALTER TABLE users ADD COLUMN verification_expires DATETIME`);
    } catch (e) {
      // ignore if column already exists or ALTER not supported
    }

    // Create index for verification token to speed up lookups during email verification
    try {
      await this.run(`CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users (verification_token)`);
    } catch (e) {
      // ignore if index creation fails on older sqlite versions
    }
    await this.run(`
      CREATE TABLE IF NOT EXISTS contents (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        image_url TEXT NOT NULL,
        duration INTEGER NOT NULL,
        tags TEXT DEFAULT '[]',
        vr_url TEXT NOT NULL,
        created_by TEXT NOT NULL,
        created_at DATETIME DEFAULT (datetime('now'))
      )
    `);
    // Add is_admin column to existing installs (no-op if column exists)
    try {
      await this.run(`ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0`);
    } catch (e) {
      // ignore if column already exists or DB doesn't support ALTER in this context
    }
  }

  // Normalize DB row to application-friendly user shape
  private normalizeUser(row: any) {
    if (!row) return undefined;
    return {
      ...row,
      isSeller: !!row.is_seller || !!row.isSeller,
      isAdmin: !!row.is_admin || !!row.isAdmin,
      isVerified: !!row.is_verified || !!row.isVerified,
      stripeId: row.stripe_id || row.stripeId,
      preferences: (() => {
        try {
          return typeof row.preferences === 'string' ? JSON.parse(row.preferences) : row.preferences || {};
        } catch (e) {
          return {};
        }
      })(),
      verificationToken: row.verification_token || row.verificationToken,
      verificationExpires: row.verification_expires || row.verificationExpires,
    };
  }

  // Normalize DB row to application-friendly content shape
  private normalizeContent(row: any) {
    if (!row) return undefined;
    const tags = (() => {
      try {
        if (Array.isArray(row.tags)) return row.tags;
        if (typeof row.tags === 'string') return JSON.parse(row.tags);
        return row.tags || [];
      } catch (e) {
        // fallback: if it's a CSV string
        if (typeof row.tags === 'string') return row.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
        return [];
      }
    })();

    return {
      ...row,
      id: row.id,
      title: row.title,
      description: row.description,
      imageUrl: row.image_url || row.imageUrl,
      vrUrl: row.vr_url || row.vrUrl,
      duration: typeof row.duration === 'number' ? row.duration : Number(row.duration),
      tags,
      createdBy: row.created_by || row.createdBy,
      createdAt: row.created_at || row.createdAt,
    };
  }

  // Users
  async getUser(id: string) {
    const row = await this.get<any>(`SELECT * FROM users WHERE id = ?`, [id]);
    return this.normalizeUser(row);
  }

  async getAllUsers() {
    const rows = await this.all<any>(`SELECT * FROM users ORDER BY created_at DESC`);
    return rows.map((r) => this.normalizeUser(r));
  }

  async getUserByEmail(email: string) {
    const row = await this.get<any>(`SELECT * FROM users WHERE email = ?`, [email]);
    return this.normalizeUser(row);
  }

  async getUserByVerificationToken(token: string) {
    const row = await this.get<any>(`SELECT * FROM users WHERE verification_token = ?`, [token]);
    return this.normalizeUser(row);
  }

  async createUser(user: any) {
    const id = (user.id as string) || randomUUID();
    const preferences = user.preferences ? JSON.stringify(user.preferences) : '{}';
    await this.run(
      `INSERT INTO users (id, name, email, password, theater, avatar, is_verified, verification_token, verification_expires, is_seller, is_admin, stripe_id, preferences) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        user.name,
        user.email,
        user.password,
        user.theater || null,
        user.avatar || null,
        user.isVerified ? 1 : 0,
        user.verificationToken || null,
        user.verificationExpires || null,
        user.isSeller ? 1 : 0,
        user.isAdmin ? 1 : 0,
        user.stripeId || null,
        preferences,
      ]
    );
    return this.getUser(id);
  }

  async updateUser(id: string, userData: any) {
    const setParts: string[] = [];
    const params: any[] = [];
    for (const key of Object.keys(userData)) {
      if (key === 'preferences') {
        setParts.push('preferences = ?');
        params.push(JSON.stringify(userData[key]));
      } else if (key === 'verificationToken') {
        setParts.push('verification_token = ?');
        params.push(userData[key]);
      } else if (key === 'verificationExpires') {
        setParts.push('verification_expires = ?');
        params.push(userData[key]);
      } else if (key === 'isAdmin') {
        setParts.push('is_admin = ?');
        params.push(userData[key] ? 1 : 0);
      } else if (key === 'isSeller') {
        setParts.push('is_seller = ?');
        params.push(userData[key] ? 1 : 0);
      } else if (key === 'isVerified') {
        setParts.push('is_verified = ?');
        params.push(userData[key] ? 1 : 0);
      } else if (key === 'stripeId') {
        setParts.push('stripe_id = ?');
        params.push(userData[key]);
      } else {
        setParts.push(`${key} = ?`);
        params.push(userData[key]);
      }
    }
    if (setParts.length === 0) return this.getUser(id);
    params.push(id);
    await this.run(`UPDATE users SET ${setParts.join(', ')} WHERE id = ?`, params);
    return this.getUser(id) as any;
  }

  async deleteUser(id: string) {
    await this.run(`DELETE FROM users WHERE id = ?`, [id]);
    return;
  }

  // Contents
  async getContents(params: any = {}) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const tag = params.tag || 'all';
    const sellerId = params.sellerId || null;
    const offset = (page - 1) * limit;

    let rows: any[] = [];
    if (sellerId) {
      if (tag && tag !== 'all') {
        rows = await this.all(`SELECT * FROM contents WHERE created_by = ? AND json_extract(tags, '$') LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?`, [sellerId, `%${tag}%`, limit + 1, offset]);
      } else {
        rows = await this.all(`SELECT * FROM contents WHERE created_by = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`, [sellerId, limit + 1, offset]);
      }
    } else {
      if (tag && tag !== 'all') {
        rows = await this.all(`SELECT * FROM contents WHERE json_extract(tags, '$') LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?`, [`%${tag}%`, limit + 1, offset]);
      } else {
        rows = await this.all(`SELECT * FROM contents ORDER BY created_at DESC LIMIT ? OFFSET ?`, [limit + 1, offset]);
      }
    }

    const hasMore = rows.length > limit;
    const paginated = hasMore ? rows.slice(0, limit) : rows;
    // Count should respect seller filter
    const countSql = sellerId ? `SELECT COUNT(*) as count FROM contents WHERE created_by = ?` : `SELECT COUNT(*) as count FROM contents`;
    const countRow = sellerId ? await this.get<any>(countSql, [sellerId]) : await this.get<any>(countSql);
    // Normalize rows to application shape
    const normalized = paginated.map((r) => this.normalizeContent(r));
    return { contents: normalized, total: countRow.count || 0, hasMore };
  }

  async getContentById(id: string) {
    const row = await this.get<any>(`SELECT * FROM contents WHERE id = ?`, [id]);
    return this.normalizeContent(row);
  }

  async createContent(content: any) {
    const id = content.id || randomUUID();
    const tags = content.tags ? JSON.stringify(content.tags) : '[]';
    await this.run(`INSERT INTO contents (id, title, description, image_url, duration, tags, vr_url, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [id, content.title, content.description, content.image_url, content.duration, tags, content.vr_url, content.createdBy]);
    return this.getContentById(id);
  }

  async updateContent(id: string, data: any) {
    try {
      // Map camelCase to snake_case and allow only DB columns
      const allowed = new Set(['title', 'description', 'image_url', 'duration', 'tags', 'vr_url']);
      const mapped: any = {};
      for (const key of Object.keys(data)) {
        let col = key;
        if (key === 'imageUrl') col = 'image_url';
        if (key === 'vrUrl') col = 'vr_url';
        if (!allowed.has(col)) continue;
        mapped[col] = data[key];
      }

      const setParts: string[] = [];
      const params: any[] = [];
      for (const key of Object.keys(mapped)) {
        if (key === 'tags') {
          setParts.push('tags = ?');
          params.push(JSON.stringify(mapped[key]));
        } else {
          setParts.push(`${key} = ?`);
          params.push(mapped[key]);
        }
      }

      if (setParts.length === 0) return this.getContentById(id);
      params.push(id);
      await this.run(`UPDATE contents SET ${setParts.join(', ')} WHERE id = ?`, params);
      return this.getContentById(id);
    } catch (err) {
      const msg = (err as any)?.message ?? String(err);
      console.error('Error in updateContent:', msg);
      throw err;
    }
  }

  async deleteContent(id: string) {
    await this.run(`DELETE FROM contents WHERE id = ?`, [id]);
    return;
  }

  // Stripe
  async updateUserStripeInfo(userId: string, stripeId: string, isSeller: boolean) {
    await this.run(`UPDATE users SET stripe_id = ?, is_seller = ? WHERE id = ?`, [stripeId, isSeller ? 1 : 0, userId]);
    return this.getUser(userId) as any;
  }

  async getUserByStripeId(stripeId: string) {
    return this.get<User>(`SELECT * FROM users WHERE stripe_id = ?`, [stripeId]);
  }
}

// Initialize storage based on DATABASE_URL
let dbFile = './db.sqlite';
if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('sqlite:')) {
  dbFile = process.env.DATABASE_URL.replace('sqlite:', '') || dbFile;
}

export const storage = new SqliteStorage(dbFile);
