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
  }): Promise<{ contents: Content[]; total: number; hasMore: boolean }>;
  getContentById(id: string): Promise<Content | undefined>;
  createContent(content: InsertContent): Promise<Content>;
  
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
        is_seller INTEGER DEFAULT 0,
        stripe_id TEXT,
        preferences TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT (datetime('now'))
      )
    `);
      await this.run(`
      UPDATE users SET is_verified = 1, is_seller = 1 WHERE is_verified = 0 
    `);
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
  }

  // Users
  async getUser(id: string) {
    const row = await this.get<any>(`SELECT * FROM users WHERE id = ?`, [id]);
    return row;
  }

  async getUserByEmail(email: string) {
    const row = await this.get<any>(`SELECT * FROM users WHERE email = ?`, [email]);
    return row;
  }

  async createUser(user: any) {
    const id = (user.id as string) || randomUUID();
    const preferences = user.preferences ? JSON.stringify(user.preferences) : '{}';
    await this.run(
      `INSERT INTO users (id, name, email, password, theater, avatar, is_verified, is_seller, stripe_id, preferences) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, user.name, user.email, user.password, user.theater || null, user.avatar || null, user.isVerified ? 1 : 0, user.isSeller ? 1 : 0, user.stripeId || null, preferences]
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

  // Contents
  async getContents(params: any = {}) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const tag = params.tag || 'all';
    const offset = (page - 1) * limit;

    let rows: any[] = [];
    if (tag && tag !== 'all') {
      rows = await this.all(`SELECT * FROM contents WHERE json_extract(tags, '$') LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?`, [`%${tag}%`, limit + 1, offset]);
    } else {
      rows = await this.all(`SELECT * FROM contents ORDER BY created_at DESC LIMIT ? OFFSET ?`, [limit + 1, offset]);
    }

    const hasMore = rows.length > limit;
    const paginated = hasMore ? rows.slice(0, limit) : rows;
    const countRow = await this.get<any>(`SELECT COUNT(*) as count FROM contents`);
    return { contents: paginated, total: countRow.count || 0, hasMore };
  }

  async getContentById(id: string) {
    return this.get<any>(`SELECT * FROM contents WHERE id = ?`, [id]);
  }

  async createContent(content: any) {
    const id = content.id || randomUUID();
    const tags = content.tags ? JSON.stringify(content.tags) : '[]';
    await this.run(`INSERT INTO contents (id, title, description, image_url, duration, tags, vr_url, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [id, content.title, content.description, content.image_url, content.duration, tags, content.vr_url, content.createdBy]);
    return this.getContentById(id);
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
