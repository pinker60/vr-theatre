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
    //await this.run(`DROP TABLE IF EXISTS contents`);
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
        created_at DATETIME DEFAULT (datetime('now')),
        event_type TEXT NOT NULL DEFAULT 'ondemand',
        start_datetime DATETIME,
        available_until DATETIME,
        available_tickets INTEGER DEFAULT 0,
        total_tickets INTEGER DEFAULT 0,
        unlimited_tickets BOOLEAN DEFAULT FALSE,
        ticket_price_standard DECIMAL(10,2) DEFAULT 0.00,
        ticket_price_vip DECIMAL(10,2) DEFAULT 0.00,
        ticket_price_premium DECIMAL(10,2) DEFAULT 0.00 
      
        )
    `);
      // Application settings (single row JSON store)
      await this.run(`
        CREATE TABLE IF NOT EXISTS app_settings (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          data TEXT NOT NULL DEFAULT '{}'
        )
      `);
      // Ensure single row exists
      try {
        await this.run(`INSERT INTO app_settings (id, data) VALUES (1, '{}')`);
      } catch (e) { /* exists */ }
      // Orders and tickets for purchases
      await this.run(`
        CREATE TABLE IF NOT EXISTS orders (
          id TEXT PRIMARY KEY,
          content_id TEXT NOT NULL,
          user_id TEXT,
          buyer_email TEXT NOT NULL,
          ticket_type TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          total_amount INTEGER NOT NULL,
          currency TEXT NOT NULL DEFAULT 'eur',
          status TEXT NOT NULL DEFAULT 'pending',
          stripe_session_id TEXT,
          created_at DATETIME DEFAULT (datetime('now')),
          group_id TEXT
        )
      `);
      // Add group_id to existing installs
      try { await this.run(`ALTER TABLE orders ADD COLUMN group_id TEXT`); } catch (e) { /* ignore */ }

      // Order groups to support cart checkout and fee breakdown
      await this.run(`
        CREATE TABLE IF NOT EXISTS order_groups (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          buyer_email TEXT NOT NULL,
          subtotal_amount INTEGER NOT NULL,
          service_fee_amount INTEGER NOT NULL DEFAULT 0,
          payment_fee_amount INTEGER NOT NULL DEFAULT 0,
          tax_amount INTEGER NOT NULL DEFAULT 0,
          total_amount INTEGER NOT NULL,
          currency TEXT NOT NULL DEFAULT 'eur',
          status TEXT NOT NULL DEFAULT 'pending',
          stripe_session_id TEXT,
          created_at DATETIME DEFAULT (datetime('now'))
        )
      `);
      await this.run(`
        CREATE TABLE IF NOT EXISTS tickets (
          id TEXT PRIMARY KEY,
          order_id TEXT NOT NULL,
          content_id TEXT NOT NULL,
          ticket_type TEXT NOT NULL,
          code TEXT NOT NULL UNIQUE,
          issued_to TEXT,
          created_at DATETIME DEFAULT (datetime('now'))
        )
      `);
      // add usage columns if missing
      try { await this.run(`ALTER TABLE tickets ADD COLUMN used_at DATETIME`); } catch (e) { /* ignore */ }
      try { await this.run(`ALTER TABLE tickets ADD COLUMN used_by TEXT`); } catch (e) { /* ignore */ }
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
      // Event/pricing fields (camelCase for frontend)
      eventType: row.event_type || row.eventType || 'ondemand',
      startDatetime: row.start_datetime || row.startDatetime || null,
      availableUntil: row.available_until || row.availableUntil || null,
      availableTickets: typeof row.available_tickets === 'number' ? row.available_tickets : (row.available_tickets != null ? Number(row.available_tickets) : 0),
      totalTickets: typeof row.total_tickets === 'number' ? row.total_tickets : (row.total_tickets != null ? Number(row.total_tickets) : 0),
      unlimitedTickets: typeof row.unlimited_tickets === 'boolean' ? row.unlimited_tickets : !!row.unlimited_tickets,
      ticketPriceStandard: typeof row.ticket_price_standard === 'number' ? row.ticket_price_standard : (row.ticket_price_standard != null ? Number(row.ticket_price_standard) : 0),
      ticketPriceVip: typeof row.ticket_price_vip === 'number' ? row.ticket_price_vip : (row.ticket_price_vip != null ? Number(row.ticket_price_vip) : 0),
      ticketPricePremium: typeof row.ticket_price_premium === 'number' ? row.ticket_price_premium : (row.ticket_price_premium != null ? Number(row.ticket_price_premium) : 0),
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
      } else if (key === 'isVerified') {
        setParts.push('is_verified = ?');
        params.push(userData[key] ? 1 : 0);
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
    // Resolve optional pricing/event fields (accept camelCase or snake_case)
    const event_type = content.event_type ?? content.eventType ?? 'ondemand';
    const start_datetime = content.start_datetime ?? content.startDatetime ?? null;
    const available_until = content.available_until ?? content.availableUntil ?? null;
    const total_tickets = content.total_tickets ?? content.totalTickets ?? 0;
    const unlimited_tickets = (content.unlimited_tickets ?? content.unlimitedTickets ?? false) ? 1 : 0;
    const available_tickets = content.available_tickets ?? content.availableTickets ?? (unlimited_tickets ? 0 : total_tickets);
    const ticket_price_standard = content.ticket_price_standard ?? content.ticketPriceStandard ?? 0;
    const ticket_price_vip = content.ticket_price_vip ?? content.ticketPriceVip ?? 0;
    const ticket_price_premium = content.ticket_price_premium ?? content.ticketPricePremium ?? 0;

    await this.run(
      `INSERT INTO contents (
        id, title, description, image_url, duration, tags, vr_url, created_by,
        event_type, start_datetime, available_until, available_tickets, total_tickets, unlimited_tickets,
        ticket_price_standard, ticket_price_vip, ticket_price_premium
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        content.title,
        content.description,
        content.image_url,
        content.duration,
        tags,
        content.vr_url,
        content.createdBy,
        event_type,
        start_datetime,
        available_until,
        available_tickets,
        total_tickets,
        unlimited_tickets,
        ticket_price_standard,
        ticket_price_vip,
        ticket_price_premium,
      ]
    );
    return this.getContentById(id);
  }

  async updateContent(id: string, data: any) {
    try {
      // Map camelCase to snake_case and allow only DB columns
      const allowed = new Set([
        'title', 'description', 'image_url', 'duration', 'tags', 'vr_url',
        'event_type', 'start_datetime', 'available_until',
        'available_tickets', 'total_tickets', 'unlimited_tickets',
        'ticket_price_standard', 'ticket_price_vip', 'ticket_price_premium'
      ]);
      const mapped: any = {};
      for (const key of Object.keys(data)) {
        let col = key;
        if (key === 'imageUrl') col = 'image_url';
        if (key === 'vrUrl') col = 'vr_url';
        if (key === 'eventType') col = 'event_type';
        if (key === 'startDatetime') col = 'start_datetime';
        if (key === 'availableUntil') col = 'available_until';
        if (key === 'availableTickets') col = 'available_tickets';
        if (key === 'totalTickets') col = 'total_tickets';
        if (key === 'unlimitedTickets') col = 'unlimited_tickets';
        if (key === 'ticketPriceStandard') col = 'ticket_price_standard';
        if (key === 'ticketPriceVip') col = 'ticket_price_vip';
        if (key === 'ticketPricePremium') col = 'ticket_price_premium';
        if (!allowed.has(col)) continue;
        mapped[col] = data[key];
      }

      const setParts: string[] = [];
      const params: any[] = [];
      for (const key of Object.keys(mapped)) {
        if (key === 'tags') {
          setParts.push('tags = ?');
          params.push(JSON.stringify(mapped[key]));
        } else if (key === 'unlimited_tickets') {
          setParts.push('unlimited_tickets = ?');
          params.push(mapped[key] ? 1 : 0);
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

  // Settings
  async getSettings(): Promise<any> {
    const row = await this.get<any>(`SELECT data FROM app_settings WHERE id = 1`);
    try { return row?.data ? JSON.parse(row.data) : {}; } catch { return {}; }
  }
  async updateSettings(partial: any): Promise<any> {
    const current = await this.getSettings();
    const merged = { ...current, ...partial };
    await this.run(`UPDATE app_settings SET data = ? WHERE id = 1`, [JSON.stringify(merged)]);
    return merged;
  }

  // Orders helpers
  async createOrder(data: { id?: string; contentId: string; userId?: string | null; buyerEmail: string; ticketType: string; quantity: number; totalAmount: number; currency?: string; status?: string; stripeSessionId?: string | null; }) {
    const id = data.id || randomUUID();
    await this.run(`INSERT INTO orders (id, content_id, user_id, buyer_email, ticket_type, quantity, total_amount, currency, status, stripe_session_id) VALUES (?,?,?,?,?,?,?,?,?,?)`, [
      id,
      data.contentId,
      data.userId || null,
      data.buyerEmail,
      data.ticketType,
      data.quantity,
      data.totalAmount,
      data.currency || 'eur',
      data.status || 'pending',
      data.stripeSessionId || null,
    ]);
    return this.get<any>(`SELECT * FROM orders WHERE id = ?`, [id]);
  }

  async createOrderInGroup(groupId: string, data: { id?: string; contentId: string; userId?: string | null; buyerEmail: string; ticketType: string; quantity: number; totalAmount: number; currency?: string; status?: string; }) {
    const id = data.id || randomUUID();
    await this.run(`INSERT INTO orders (id, content_id, user_id, buyer_email, ticket_type, quantity, total_amount, currency, status, group_id) VALUES (?,?,?,?,?,?,?,?,?,?)`, [
      id,
      data.contentId,
      data.userId || null,
      data.buyerEmail,
      data.ticketType,
      data.quantity,
      data.totalAmount,
      data.currency || 'eur',
      data.status || 'pending',
      groupId,
    ]);
    return this.get<any>(`SELECT * FROM orders WHERE id = ?`, [id]);
  }

  async setOrderPaid(orderId: string) {
    await this.run(`UPDATE orders SET status = 'paid' WHERE id = ?`, [orderId]);
    return this.get<any>(`SELECT * FROM orders WHERE id = ?`, [orderId]);
  }

  async getOrderByStripeSession(sessionId: string) {
    return this.get<any>(`SELECT * FROM orders WHERE stripe_session_id = ?`, [sessionId]);
  }

  async setOrderStripeSession(orderId: string, sessionId: string) {
    await this.run(`UPDATE orders SET stripe_session_id = ? WHERE id = ?`, [sessionId, orderId]);
  }

  // Order groups helpers
  async createOrderGroup(data: { id?: string; userId?: string | null; buyerEmail: string; subtotalAmount: number; serviceFeeAmount: number; paymentFeeAmount: number; taxAmount: number; totalAmount: number; currency?: string; }) {
    const id = data.id || randomUUID();
    await this.run(`INSERT INTO order_groups (id, user_id, buyer_email, subtotal_amount, service_fee_amount, payment_fee_amount, tax_amount, total_amount, currency, status) VALUES (?,?,?,?,?,?,?,?,?, 'pending')`, [
      id,
      data.userId || null,
      data.buyerEmail,
      Math.round(data.subtotalAmount),
      Math.round(data.serviceFeeAmount || 0),
      Math.round(data.paymentFeeAmount || 0),
      Math.round(data.taxAmount || 0),
      Math.round(data.totalAmount),
      data.currency || 'eur',
    ]);
    return this.get<any>(`SELECT * FROM order_groups WHERE id = ?`, [id]);
  }

  async setOrderGroupStripeSession(groupId: string, sessionId: string) {
    await this.run(`UPDATE order_groups SET stripe_session_id = ? WHERE id = ?`, [sessionId, groupId]);
  }

  async getOrderGroupByStripeSession(sessionId: string) {
    return this.get<any>(`SELECT * FROM order_groups WHERE stripe_session_id = ?`, [sessionId]);
  }

  async setOrderGroupPaid(groupId: string) {
    await this.run(`UPDATE order_groups SET status = 'paid' WHERE id = ?`, [groupId]);
    // Also mark all child orders as paid
    await this.run(`UPDATE orders SET status = 'paid' WHERE group_id = ?`, [groupId]);
    return this.get<any>(`SELECT * FROM order_groups WHERE id = ?`, [groupId]);
  }

  async getOrderGroup(id: string) {
    return this.get<any>(`SELECT * FROM order_groups WHERE id = ?`, [id]);
  }

  async getOrdersByGroupId(groupId: string) {
    return this.all<any>(`SELECT * FROM orders WHERE group_id = ? ORDER BY created_at ASC`, [groupId]);
  }

  async getTicketsByOrderIds(orderIds: string[]) {
    if (!orderIds.length) return [] as any[];
    const placeholders = orderIds.map(() => '?').join(',');
    return this.all<any>(`SELECT * FROM tickets WHERE order_id IN (${placeholders}) ORDER BY created_at ASC`, orderIds as any);
  }

  async issueTickets(order: any) {
    const tickets: any[] = [];
    for (let i = 0; i < Number(order.quantity || 0); i++) {
      const code = 'VR-' + Math.random().toString(36).slice(2, 8).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
      const id = randomUUID();
      await this.run(`INSERT INTO tickets (id, order_id, content_id, ticket_type, code, issued_to) VALUES (?,?,?,?,?,?)`, [
        id,
        order.id,
        order.content_id,
        order.ticket_type,
        code,
        order.buyer_email,
      ]);
      tickets.push({ id, code, ticketType: order.ticket_type });
    }
    return tickets;
  }

  async decrementAvailableTickets(contentId: string, quantity: number) {
    const row = await this.get<any>(`SELECT unlimited_tickets, available_tickets FROM contents WHERE id = ?`, [contentId]);
    if (!row) return;
    const unlimited = !!row.unlimited_tickets;
    if (unlimited) return; // no decrement
    const current = Number(row.available_tickets || 0);
    const next = Math.max(0, current - Number(quantity || 0));
    await this.run(`UPDATE contents SET available_tickets = ? WHERE id = ?`, [next, contentId]);
  }

  // Vouchers / Tickets
  async getTicketByCode(code: string) {
    return this.get<any>(`SELECT * FROM tickets WHERE code = ?`, [code]);
  }

  async redeemTicket(code: string, contentId: string, userId?: string) {
    const ticket = await this.get<any>(`SELECT * FROM tickets WHERE code = ?`, [code]);
    if (!ticket) throw new Error('Ticket non trovato');
    if (ticket.content_id !== contentId) throw new Error('Ticket non valido per questo contenuto');
    if (ticket.used_at) throw new Error('Ticket già utilizzato');
    await this.run(`UPDATE tickets SET used_at = datetime('now'), used_by = ? WHERE id = ?`, [userId || null, ticket.id]);
    return this.get<any>(`SELECT * FROM tickets WHERE id = ?`, [ticket.id]);
  }
}

// Initialize storage based on DATABASE_URL
let dbFile = './db.sqlite';
if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('sqlite:')) {
  dbFile = process.env.DATABASE_URL.replace('sqlite:', '') || dbFile;
}

export const storage = new SqliteStorage(dbFile);
