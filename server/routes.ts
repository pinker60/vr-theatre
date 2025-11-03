
import type { Express } from "express";
import { createServer, type Server } from "http";
import { randomUUID } from 'crypto';
import { storage } from "./storage";
import bcrypt from "bcrypt";
import nodemailer from 'nodemailer';
import jwt from "jsonwebtoken";
import Stripe from "stripe";
import QRCode from 'qrcode';
import { insertUserSchema, insertContentSchema } from "../shared/schema";
import { fromZodError } from "zod-validation-error";
import { Readable } from "stream";

// JWT Secret - require in production, provide safe fallback in development
let JWT_SECRET: string;
if (process.env.JWT_SECRET) {
  JWT_SECRET = process.env.JWT_SECRET;
} else if (process.env.NODE_ENV !== 'production') {
  JWT_SECRET = 'dev-insecure-secret-change-me';
  console.warn('[DEV] JWT_SECRET not set. Using an insecure development secret. Do NOT use in production.');
} else {
  throw new Error(
    'CRITICAL SECURITY ERROR: JWT_SECRET environment variable is required but not set.\n' +
    'Generate a secure secret with: openssl rand -hex 32\n' +
    'Then add it to your .env file: JWT_SECRET=<your-secret>'
  );
}

// Stripe webhook signing secret - required for webhook endpoint
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// Stripe initialization - optional for development, required for production
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  // cast apiVersion to any to avoid type mismatch warnings with the installed stripe types
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2023-10-16" as any,
  } as any);
} else {
  console.warn('WARNING: STRIPE_SECRET_KEY not set. Stripe functionality will be disabled.');
}

// JWT Middleware
interface AuthRequest extends Express.Request {
  user?: any;
}

const authMiddleware = async (req: any, res: any, next: any) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded: any = jwt.verify(token, JWT_SECRET);
    const user = await storage.getUser(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {

  // POST /api/admin/promote - Promote a user to admin (admin only)
  app.post('/api/admin/promote', authMiddleware, async (req: any, res: any) => {
    try {
      if (!req.user.isAdmin) return res.status(403).json({ message: 'Only admins can promote users' });
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ message: 'userId required' });
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: 'User not found' });
      await storage.updateUser(userId, { is_admin: 1 });
      res.json({ message: 'User promoted to admin' });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });
  
  // ===== AUTHENTICATION ROUTES =====
  
  // POST /api/auth/register - Register new user
  app.post("/api/auth/register", async (req, res) => {
    try {
      // Validate request body with Zod
      const validation = insertUserSchema.safeParse(req.body);
      if (!validation.success) {
        const readableError = fromZodError(validation.error);
        return res.status(400).json({ message: readableError.message });
      }

  const { name, email, password, theater } = validation.data;
  // GDPR/consents (optional extra fields not in zod schema)
  const marketingConsent = !!(req.body?.marketingConsent || req.body?.consentMarketing);
  const notificationsConsent = !!(req.body?.notificationsConsent || req.body?.consentNotifications);
  const privacyAccepted = !!(req.body?.gdprConsent || req.body?.acceptPrivacy);

      // Check if user exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'Email already registered' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create email verification token and expiry (24 hours)
      const verificationToken = randomUUID();
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      // Create user (is_verified defaults to false)
      const user = await storage.createUser({
        name,
        email,
        password: hashedPassword,
        theater: theater || null,
        verificationToken,
        verificationExpires,
        isVerified: false,
        preferences: {
          consents: {
            marketing: marketingConsent,
            notifications: notificationsConsent,
            privacyAcceptedAt: privacyAccepted ? new Date().toISOString() : null,
          }
        }
      });

      // Generate JWT for immediate client use (optional)
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

      // Load settings for email configuration
      const settings = await (storage as any).getSettings?.().catch(() => ({})) || {};

      // Send verification email (best-effort)
      try {
        // Configure transporter from settings or env
        const smtpHost = settings.smtpHost || process.env.SMTP_HOST;
        const smtpPort = settings.smtpPort ? Number(settings.smtpPort) : (process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined);
        const smtpUser = settings.smtpUser || process.env.SMTP_USER;
        const smtpPass = settings.smtpPass || process.env.SMTP_PASS;
        const appUrl = settings.appUrl || process.env.APP_URL || 'http://localhost:5000';

        if (smtpHost && smtpPort && smtpUser && smtpPass) {
          const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465, // true for 465, false for other ports
            auth: { user: smtpUser, pass: smtpPass },
          });

          const verifyLink = `${appUrl}/api/auth/verify?token=${encodeURIComponent(verificationToken)}`;

          await transporter.sendMail({
            from: settings.smtpFrom || process.env.SMTP_FROM || `no-reply@${new URL(appUrl).hostname}`,
            to: user.email,
            subject: 'Verifica la tua email per VR Theatre',
            text: `Ciao ${user.name || ''},\n\nVisita il seguente link per verificare la tua email:\n${verifyLink}\n\nQuesto link scadrà in 24 ore.`,
            html: `<p>Ciao ${user.name || ''},</p><p>Visita il seguente link per verificare la tua email:</p><p><a href="${verifyLink}">${verifyLink}</a></p><p>Questo link scadrà in 24 ore.</p>`,
          });
        } else {
          console.warn('SMTP not configured; skipping verification email send');
        }
      } catch (mailErr: any) {
        console.error('Error sending verification email:', mailErr?.message || mailErr);
      }

      // Don't send password back
      const { password: _, ...userWithoutPassword } = user;

      res.status(201).json({
        user: userWithoutPassword,
        token,
        message: 'User created. Please verify your email.'
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // GET /api/auth/verify - Verify user by token
  app.get('/api/auth/verify', async (req, res) => {
    try {
      const token = req.query.token as string;
      if (!token) return res.status(400).json({ message: 'Token is required' });

      // Find user by token
      const user = await storage.getUserByVerificationToken(token);
      if (!user) return res.status(404).json({ message: 'Token not found or invalid' });

      // Check expiry
      const now = new Date();
      const expires = user.verificationExpires ? new Date(user.verificationExpires) : null;
      if (expires && expires < now) return res.status(400).json({ message: 'Token expired' });

      // Mark user as verified and clear token
      const updated = await storage.updateUser(user.id, { isVerified: true, verificationToken: null, verificationExpires: null });

      res.json({ message: 'Email verified', user: { id: updated.id, email: updated.email, isVerified: true } });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // POST /api/auth/login - Login user
  app.post("/api/auth/login", async (req, res) => {
    try {
      // Validate required fields
      if (!req.body.email || !req.body.password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }

      const { email, password } = req.body;

      // Find user
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Generate token
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

      // Don't send password back
      const { password: _, ...userWithoutPassword } = user;

      res.json({
        user: userWithoutPassword,
        token,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // GET /api/auth/me - Get current user (protected)
  app.get("/api/auth/me", authMiddleware, async (req: any, res) => {
    try {
      const { password: _, ...userWithoutPassword } = req.user;
      res.json({ user: userWithoutPassword });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // POST /api/auth/reset-password - Reset password (simulated)
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { email } = req.body;

      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists for security
        return res.json({ message: 'If the email exists, a reset link has been sent' });
      }

      // In production, send email with reset token
      // For now, just return success
      res.json({ message: 'If the email exists, a reset link has been sent' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== USER ROUTES =====

  // GET /api/user/:id - Get user profile
  app.get("/api/user/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // PUT /api/user/:id - Update user profile (protected)
  app.put("/api/user/:id", authMiddleware, async (req: any, res) => {
    try {
      // Check if user is updating their own profile
      if (req.user.id !== req.params.id) {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      const { name, theater, avatar, preferences } = req.body;
      // Merge/update consents if present
      const current = req.user?.preferences || {};
      const nextPrefs = { ...(current || {}), ...(preferences || {}) } as any;
      const updateConsents = {
        marketing: req.body?.marketingConsent ?? req.body?.consentMarketing,
        notifications: req.body?.notificationsConsent ?? req.body?.consentNotifications,
        privacyAcceptedAt: (req.body?.gdprConsent || req.body?.acceptPrivacy) ? (new Date().toISOString()) : undefined,
      };
      nextPrefs.consents = { ...(current?.consents || {}), ...(preferences?.consents || {}), ...Object.fromEntries(Object.entries(updateConsents).filter(([,v]) => v !== undefined)) };

      const updatedUser = await storage.updateUser(req.params.id, {
        name,
        theater,
        avatar,
        preferences: nextPrefs,
      });

      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json({ user: userWithoutPassword });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== CONTENT ROUTES =====

  // GET /api/contents - Get contents with pagination and filters
  app.get("/api/contents", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const tag = (req.query.tag as string) || 'all';
      const sortBy = (req.query.sortBy as string) || 'recent';
      const sellerId = (req.query.sellerId as string) || undefined;

  const result = await storage.getContents({ page, limit, tag, sortBy, sellerId });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // GET /api/contents/:id - Get content by ID
  app.get("/api/contents/:id", async (req, res) => {
    try {
      const content = await storage.getContentById(req.params.id);
      if (!content) {
        return res.status(404).json({ message: 'Content not found' });
      }

      res.json(content);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // POST /api/contents - Create new content (protected, sellers only)
  app.post("/api/contents", authMiddleware, async (req: any, res) => {
    try {
      // Check if user is a seller
      if (!req.user.isSeller) {
        return res.status(403).json({ message: 'Only sellers can create content' });
      }

      // Normalize incoming payload to accept snake_case or camelCase
      const incoming: any = { ...req.body };
      if (incoming.image_url && !incoming.imageUrl) incoming.imageUrl = incoming.image_url;
      if (incoming.vr_url && !incoming.vrUrl) incoming.vrUrl = incoming.vr_url;
      // tags may come as an array, a JSON-stringified array, or a CSV string
      if (typeof incoming.tags === 'string') {
        const t = incoming.tags.trim();
        if (t.startsWith('[')) {
          try { incoming.tags = JSON.parse(t); } catch (e) { /* leave as string */ }
        }
      }

      // Validate request body with Zod (expects camelCase keys from shared/schema)
      const validation = insertContentSchema.safeParse({
        ...incoming,
        createdBy: req.user.id,
      });

      if (!validation.success) {
        const readableError = fromZodError(validation.error);
        return res.status(400).json({ message: readableError.message });
      }

      // Map validated fields to DB snake_case, supporting both camelCase and snake_case from schema result
      const v = validation.data as any;
      const dbPayload: any = {
        title: v.title,
        description: v.description,
        duration: v.duration,
        // Prefer camelCase but fallback to snake_case if schema produced that
        image_url: v.imageUrl ?? v.image_url,
        vr_url: v.vrUrl ?? v.vr_url,
        tags: v.tags,
        createdBy: v.createdBy ?? v.created_by ?? req.user.id,
      };

  // Note: dbPayload already normalized; no need to keep camelCase duplicates

      // Also accept optional pricing/event fields from incoming (accept camelCase or snake_case)
      const raw = incoming;
      dbPayload.event_type = raw.event_type ?? raw.eventType ?? 'ondemand';
      dbPayload.start_datetime = raw.start_datetime ?? raw.startDatetime ?? null;
      dbPayload.available_until = raw.available_until ?? raw.availableUntil ?? null;
      const totalTickets = raw.total_tickets ?? raw.totalTickets ?? 0;
      const unlimited = (raw.unlimited_tickets ?? raw.unlimitedTickets ?? false) ? 1 : 0;
      dbPayload.total_tickets = totalTickets;
      dbPayload.unlimited_tickets = unlimited;
      dbPayload.available_tickets = raw.available_tickets ?? raw.availableTickets ?? (unlimited ? 0 : totalTickets);
      dbPayload.ticket_price_standard = raw.ticket_price_standard ?? raw.ticketPriceStandard ?? 0;
      dbPayload.ticket_price_vip = raw.ticket_price_vip ?? raw.ticketPriceVip ?? 0;
      dbPayload.ticket_price_premium = raw.ticket_price_premium ?? raw.ticketPricePremium ?? 0;

      const content = await storage.createContent(dbPayload);

      res.status(201).json(content);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // PUT /api/contents/:id - Update content (protected, only owner)
  app.put("/api/contents/:id", authMiddleware, async (req: any, res) => {
    try {
      const contentId = req.params.id;
      const existing = await storage.getContentById(contentId);
      if (!existing) return res.status(404).json({ message: 'Content not found' });
      if (existing.created_by !== req.user.id) return res.status(403).json({ message: 'Forbidden' });

      // Sanitize and map incoming update payload to DB column names only
      const raw: any = { ...req.body };
      // Parse tags if sent as JSON string
      if (typeof raw.tags === 'string') {
        const t = raw.tags.trim();
        if (t.startsWith('[')) {
          try { raw.tags = JSON.parse(t); } catch (e) { /* leave as string */ }
        }
      }

      // Allowed DB fields
      const allowed = [
        'title', 'description', 'image_url', 'duration', 'tags', 'vr_url',
        'event_type', 'start_datetime', 'available_until',
        'available_tickets', 'total_tickets', 'unlimited_tickets',
        'ticket_price_standard', 'ticket_price_vip', 'ticket_price_premium'
      ];
      const cleaned: any = {};
      if (raw.title !== undefined) cleaned.title = raw.title;
      if (raw.description !== undefined) cleaned.description = raw.description;
      if (raw.duration !== undefined) cleaned.duration = raw.duration;
      // image: accept camelCase or snake_case
      if (raw.image_url !== undefined) cleaned.image_url = raw.image_url;
      else if (raw.imageUrl !== undefined) cleaned.image_url = raw.imageUrl;
      // vr url
      if (raw.vr_url !== undefined) cleaned.vr_url = raw.vr_url;
      else if (raw.vrUrl !== undefined) cleaned.vr_url = raw.vrUrl;
      // tags
      if (raw.tags !== undefined) cleaned.tags = raw.tags;

      // pricing/event fields (accept both cases)
      if (raw.event_type !== undefined) cleaned.event_type = raw.event_type;
      else if (raw.eventType !== undefined) cleaned.event_type = raw.eventType;

      if (raw.start_datetime !== undefined) cleaned.start_datetime = raw.start_datetime;
      else if (raw.startDatetime !== undefined) cleaned.start_datetime = raw.startDatetime;

      if (raw.available_until !== undefined) cleaned.available_until = raw.available_until;
      else if (raw.availableUntil !== undefined) cleaned.available_until = raw.availableUntil;

      if (raw.total_tickets !== undefined) cleaned.total_tickets = raw.total_tickets;
      else if (raw.totalTickets !== undefined) cleaned.total_tickets = raw.totalTickets;

      if (raw.unlimited_tickets !== undefined) cleaned.unlimited_tickets = raw.unlimited_tickets ? 1 : 0;
      else if (raw.unlimitedTickets !== undefined) cleaned.unlimited_tickets = raw.unlimitedTickets ? 1 : 0;

      if (raw.available_tickets !== undefined) cleaned.available_tickets = raw.available_tickets;
      else if (raw.availableTickets !== undefined) cleaned.available_tickets = raw.availableTickets;

      if (raw.ticket_price_standard !== undefined) cleaned.ticket_price_standard = raw.ticket_price_standard;
      else if (raw.ticketPriceStandard !== undefined) cleaned.ticket_price_standard = raw.ticketPriceStandard;

      if (raw.ticket_price_vip !== undefined) cleaned.ticket_price_vip = raw.ticket_price_vip;
      else if (raw.ticketPriceVip !== undefined) cleaned.ticket_price_vip = raw.ticketPriceVip;

      if (raw.ticket_price_premium !== undefined) cleaned.ticket_price_premium = raw.ticket_price_premium;
      else if (raw.ticketPricePremium !== undefined) cleaned.ticket_price_premium = raw.ticketPricePremium;

      const updated = await storage.updateContent(contentId, cleaned);
      return res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // DELETE /api/contents/:id - Delete content (protected, only owner)
  app.delete("/api/contents/:id", authMiddleware, async (req: any, res) => {
    try {
      const contentId = req.params.id;
      const existing = await storage.getContentById(contentId);
      if (!existing) return res.status(404).json({ message: 'Content not found' });
      if (existing.created_by !== req.user.id) return res.status(403).json({ message: 'Forbidden' });

      await storage.deleteContent(contentId);
      return res.json({ message: 'Deleted' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== STRIPE ROUTES =====

  // POST /api/stripe/register - Register seller with Stripe
  app.post("/api/stripe/register", authMiddleware, async (req: any, res) => {
    try {
      // Check if Stripe is available
      if (!stripe) {
        return res.status(503).json({ 
          message: 'Stripe functionality is not available. Please configure STRIPE_SECRET_KEY.' 
        });
      }

      const { companyName, vatNumber, contactEmail } = req.body;

      // Validate required fields
      if (!companyName || !vatNumber || !contactEmail) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      // Create Stripe account (test mode)
      try {
        const account = await stripe.accounts.create({
          type: 'express',
          country: 'IT',
          email: contactEmail,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          business_type: 'company',
          company: {
            name: companyName,
            tax_id: vatNumber,
          },
        });

        // Update user with Stripe info
        await storage.updateUserStripeInfo(req.user.id, account.id, true);

        return res.json({
          message: 'Seller registration successful',
          stripeAccountId: account.id,
        });
      } catch (err: any) {
        // If Stripe is not enabled for Connect, optionally fallback to a simulated creation
        const rawMsg = err?.raw?.message || err?.message || '';
        console.error('Stripe account creation error:', rawMsg);

        const allowFallback = process.env.STRIPE_ALLOW_FALLBACK === 'true';
        if (allowFallback && rawMsg.includes('signed up for Connect')) {
          const simulatedId = 'simulated_stripe_' + Date.now();
          await storage.updateUserStripeInfo(req.user.id, simulatedId, false);
          return res.json({
            message: 'Stripe not configured for Connect - simulated seller created for development',
            stripeAccountId: simulatedId,
            simulated: true,
          });
        }

        return res.status(500).json({ message: err.message || 'Stripe error' });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // GET /api/stripe/status/:userId - Get Stripe account status
  app.get("/api/stripe/status/:userId", async (req, res) => {
    try {
      // Check if Stripe is available
      if (!stripe) {
        return res.status(503).json({ 
          message: 'Stripe functionality is not available. Please configure STRIPE_SECRET_KEY.' 
        });
      }

      const user = await storage.getUser(req.params.userId);
      if (!user || !user.stripeId) {
        return res.status(404).json({ message: 'Stripe account not found' });
      }

      const account = await stripe.accounts.retrieve(user.stripeId);

      res.json({
        accountId: account.id,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // POST /api/stripe/webhook - Handle Stripe webhook events
  app.post("/api/stripe/webhook", async (req, res) => {
    let event;

    try {
      // Get raw body for signature verification
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      const rawBody = Buffer.concat(chunks).toString('utf8');

      // Verify webhook signature
      if (!STRIPE_WEBHOOK_SECRET || !stripe) {
        throw new Error('STRIPE_WEBHOOK_SECRET and STRIPE_SECRET_KEY are required for webhook handling');
      }
      
      event = stripe.webhooks.constructEvent(
        rawBody,
        req.headers['stripe-signature'] as string,
        STRIPE_WEBHOOK_SECRET
      );

      // Handle specific events
      switch (event.type) {
        case 'checkout.session.completed': {
          const session: any = event.data.object;
          try {
            // Try order group first
            const group = await (storage as any).getOrderGroupByStripeSession?.(session.id);
            if (group && group.status !== 'paid') {
              const paidGroup = await (storage as any).setOrderGroupPaid(group.id);
              const orders = await (storage as any).getOrdersByGroupId(group.id);
              const allTickets: any[] = [];
              // Issue tickets for each order item
              for (const ord of orders) {
                const paidItem = await (storage as any).setOrderPaid(ord.id);
                const t = await (storage as any).issueTickets(paidItem);
                allTickets.push(...t.map((x: any) => ({ ...x, content_id: ord.content_id })));
                await (storage as any).decrementAvailableTickets(ord.content_id, Number(ord.quantity || 0));
              }
              try { await sendCartTicketsEmail(group.buyer_email, orders, allTickets); } catch {}
            } else {
              // Fallback to single-order flow
              const order = await (storage as any).getOrderByStripeSession(session.id);
              if (order && order.status !== 'paid') {
                const paid = await (storage as any).setOrderPaid(order.id);
                const tickets = await (storage as any).issueTickets(paid);
                await (storage as any).decrementAvailableTickets(order.content_id, Number(order.quantity || 0));
                // Fetch content for email details
                const content = await storage.getContentById(order.content_id);
                try { await sendTicketsEmail(order.buyer_email, content, tickets); } catch {}
              }
            }
          } catch (e) {
            console.error('Webhook fulfillment error:', (e as any)?.message || e);
          }
          break;
        }
        case 'account.updated':
          const account = event.data.object;
          // Update user's stripe status in database
          const user = await storage.getUserByStripeId(account.id);
          if (user) {
            await storage.updateUserStripeInfo(
              user.id,
              account.id,
              account.charges_enabled
            );
          }
          break;

        case 'charge.succeeded':
          const charge = event.data.object;
          // Handle successful charge
          console.log('Payment successful:', charge.id);
          break;

        // Add other event types as needed
      }

      res.json({ received: true });
    } catch (err: any) {
      console.error('Webhook error:', err.message);
      return res.status(400).json({
        message: `Webhook Error: ${err.message}`
      });
    }
  });

  const httpServer = createServer(app);

  // ===== PURCHASE ROUTES =====
  app.post('/api/purchase', async (req: any, res) => {
    try {
      const { contentId, ticketType, quantity, method, buyerEmail } = req.body || {};
      if (!contentId || !ticketType || !quantity) {
        return res.status(400).json({ message: 'contentId, ticketType, quantity are required' });
      }
      const qty = Number(quantity);
      if (!Number.isFinite(qty) || qty < 1 || qty > 10) {
        return res.status(400).json({ message: 'Invalid quantity' });
      }

      const content = await storage.getContentById(contentId);
      if (!content) return res.status(404).json({ message: 'Content not found' });

      // Resolve prices
      const prices: Record<string, number> = {
        standard: Number(content.ticketPriceStandard ?? 0),
        vip: Number(content.ticketPriceVip ?? 0),
        premium: Number(content.ticketPricePremium ?? 0),
      };
      const price = prices[ticketType] ?? null;
      if (price == null) return res.status(400).json({ message: 'Invalid ticket type' });

      // Availability check
      const unlimited = !!(content.unlimitedTickets);
      const available = Number(content.availableTickets ?? 0);
      if (!unlimited && available < qty) {
        return res.status(400).json({ message: 'Not enough tickets available' });
      }

      // Buyer email resolution: prefer authenticated user, fallback to provided email
      let userId: string | null = null;
      let email: string | null = null;
      try {
        const authHeader = req.headers.authorization?.replace('Bearer ', '');
        if (authHeader) {
          const decoded: any = jwt.verify(authHeader, JWT_SECRET);
          const u = await storage.getUser(decoded.userId);
          if (u) { userId = u.id; email = u.email; }
        }
      } catch {}
      if (!email) email = buyerEmail || null;
      if (!email) return res.status(400).json({ message: 'buyerEmail required for guests' });

      const totalAmountCents = Math.round(Number(price) * 100) * qty;
      const order = await (storage as any).createOrder({
        contentId,
        userId,
        buyerEmail: email,
        ticketType,
        quantity: qty,
        totalAmount: totalAmountCents,
        currency: 'eur',
        status: 'pending',
      });

      const payMethod = (method || 'stripe').toLowerCase();
      const settings = await (storage as any).getSettings?.().catch(() => ({})) || {};
      if (payMethod === 'stripe') {
        if (!stripe) return res.status(503).json({ message: 'Stripe not configured', orderId: order.id });
        const session = await stripe.checkout.sessions.create({
          mode: 'payment',
          payment_method_types: ['card'],
          customer_email: email,
          line_items: [
            {
              quantity: qty,
              price_data: {
                currency: 'eur',
                unit_amount: Math.round(Number(price) * 100),
                product_data: { name: `${content.title} - ${ticketType.toUpperCase()}` },
              },
            },
          ],
          success_url: (settings.appUrl || process.env.APP_URL || 'http://localhost:5000') + `/vr/buy/${contentId}?success=1&orderId=${order.id}`,
          cancel_url: (settings.appUrl || process.env.APP_URL || 'http://localhost:5000') + `/vr/buy/${contentId}?canceled=1`,
          metadata: {
            orderId: order.id,
            contentId,
            ticketType,
            quantity: String(qty),
          },
        });
        await (storage as any).setOrderStripeSession(order.id, session.id);
        return res.json({ orderId: order.id, checkoutUrl: session.url });
      }

      // Placeholder for other payment methods
      if (payMethod === 'paypal' || payMethod === 'satispay') {
        return res.status(501).json({ message: `${payMethod} non ancora supportato`, orderId: order.id });
      }

      // Fallback: manual payment simulation (for development)
      const paid = await (storage as any).setOrderPaid(order.id);
      const tickets = await (storage as any).issueTickets(paid);
      await (storage as any).decrementAvailableTickets(contentId, qty);
      try {
        await sendTicketsEmail(email, content, tickets);
      } catch (e) {
        console.warn('Failed to send tickets email (fallback):', (e as any)?.message || e);
      }
      return res.json({ orderId: order.id, tickets });
    } catch (err: any) {
      console.error('Purchase error:', err?.message || err);
      res.status(500).json({ message: err.message || 'Purchase error' });
    }
  });

  // Cart purchase with fees and receipt
  app.post('/api/purchase/cart', async (req: any, res) => {
    try {
      const { cart, method, buyerEmail } = req.body || {};
      if (!Array.isArray(cart) || cart.length === 0) return res.status(400).json({ message: 'Cart vuoto' });

      // Resolve buyer (auth or provided email)
      let userId: string | null = null;
      let email: string | null = null;
      try {
        const authHeader = req.headers.authorization?.replace('Bearer ', '');
        if (authHeader) {
          const decoded: any = jwt.verify(authHeader, JWT_SECRET);
          const u = await storage.getUser(decoded.userId);
          if (u) { userId = u.id; email = u.email; }
        }
      } catch {}
      if (!email) email = buyerEmail || null;
      if (!email) return res.status(400).json({ message: 'buyerEmail required for guests' });

      // Validate items and compute subtotal
      type CartItem = { contentId: string; ticketType: string; quantity: number };
      const norm: CartItem[] = cart.map((it: any) => ({
        contentId: String(it.contentId),
        ticketType: String(it.ticketType),
        quantity: Math.max(1, Math.min(10, Number(it.quantity || 1)))
      }));

      let subtotal = 0;
      const lineDetails: any[] = [];
      for (const it of norm) {
        const content = await storage.getContentById(it.contentId);
        if (!content) return res.status(404).json({ message: `Content not found: ${it.contentId}` });
        const prices: Record<string, number> = {
          standard: Number(content.ticketPriceStandard ?? 0),
          vip: Number(content.ticketPriceVip ?? 0),
          premium: Number(content.ticketPricePremium ?? 0),
        };
        const unit = prices[it.ticketType];
        if (unit == null) return res.status(400).json({ message: `Invalid ticket type for content ${content.title}` });
        // Check availability
        const unlimited = !!content.unlimitedTickets;
        const available = Number(content.availableTickets || 0);
        if (!unlimited && available < it.quantity) {
          return res.status(400).json({ message: `Disponibilità insufficiente per ${content.title}` });
        }
        const unitCents = Math.round(unit * 100);
        const totalCents = unitCents * it.quantity;
        subtotal += totalCents;
        lineDetails.push({ ...it, unitCents, totalCents, title: content.title });
      }

      // Fees from settings
      const settings = await (storage as any).getSettings?.().catch(() => ({})) || {};
      const feeFixed = Number(settings.feeFixedCents || 0);
      const feePct = Number(settings.feePercent || 0); // e.g., 5 => 5%
      const payFeeFixed = Number(settings.paymentFeeFixedCents || 0);
      const payFeePct = Number(settings.paymentFeePercent || 0);
      const taxPct = Number(settings.taxPercent || 0);

      const serviceFee = Math.round(subtotal * (feePct / 100)) + Math.round(feeFixed);
      const paymentBase = subtotal + serviceFee;
      const paymentFee = Math.round(paymentBase * (payFeePct / 100)) + Math.round(payFeeFixed);
      const tax = Math.round((subtotal + serviceFee + paymentFee) * (taxPct / 100));
      const total = subtotal + serviceFee + paymentFee + tax;

      // Create order group and orders
      const group = await (storage as any).createOrderGroup({
        userId,
        buyerEmail: email,
        subtotalAmount: subtotal,
        serviceFeeAmount: serviceFee,
        paymentFeeAmount: paymentFee,
        taxAmount: tax,
        totalAmount: total,
        currency: 'eur',
      });

      const orders: any[] = [];
      for (const line of lineDetails) {
        const ord = await (storage as any).createOrderInGroup(group.id, {
          contentId: line.contentId,
          userId,
          buyerEmail: email,
          ticketType: line.ticketType,
          quantity: line.quantity,
          totalAmount: line.totalCents,
          currency: 'eur',
          status: 'pending',
        });
        orders.push(ord);
      }

      const payMethod = (method || 'stripe').toLowerCase();
      if (payMethod === 'stripe') {
        if (!stripe) return res.status(503).json({ message: 'Stripe non configurato', groupId: group.id });
        const session = await stripe.checkout.sessions.create({
          mode: 'payment',
          payment_method_types: ['card'],
          customer_email: email,
          line_items: lineDetails.map((line) => ({
            quantity: line.quantity,
            price_data: {
              currency: 'eur',
              unit_amount: line.unitCents,
              product_data: { name: `${line.title} - ${String(line.ticketType).toUpperCase()}` },
            },
          })),
          // Stripe fees are collected via platform configuration; here success redirects to receipt page
          success_url: (settings.appUrl || process.env.APP_URL || 'http://localhost:3000') + `/receipt/${group.id}?success=1`,
          cancel_url: (settings.appUrl || process.env.APP_URL || 'http://localhost:3000') + `/cart?canceled=1`,
          metadata: {
            groupId: group.id,
          },
        });
        await (storage as any).setOrderGroupStripeSession(group.id, session.id);
        return res.json({ groupId: group.id, checkoutUrl: session.url, breakdown: { subtotal, serviceFee, paymentFee, tax, total } });
      }

      // Fallback: manual payment simulation
      const paidGroup = await (storage as any).setOrderGroupPaid(group.id);
      const allTickets: any[] = [];
      for (const ord of orders) {
        const paidItem = await (storage as any).setOrderPaid(ord.id);
        const t = await (storage as any).issueTickets(paidItem);
        allTickets.push(...t.map((x: any) => ({ ...x, content_id: ord.content_id })));
        await (storage as any).decrementAvailableTickets(ord.content_id, Number(ord.quantity || 0));
      }
      try { await sendCartTicketsEmail(email, orders, allTickets); } catch {}
      return res.json({ groupId: group.id, tickets: allTickets, breakdown: { subtotal, serviceFee, paymentFee, tax, total } });
    } catch (err: any) {
      console.error('Cart purchase error:', err?.message || err);
      res.status(500).json({ message: err.message || 'Cart purchase error' });
    }
  });

  // Quote cart totals (no order creation) - returns fee/tax breakdown using current settings
  app.post('/api/purchase/cart/quote', async (req: any, res) => {
    try {
      const { cart } = req.body || {};
      if (!Array.isArray(cart) || cart.length === 0) return res.status(400).json({ message: 'Cart vuoto' });

      // Normalize items
      type CartItem = { contentId: string; ticketType: string; quantity: number };
      const norm: CartItem[] = cart.map((it: any) => ({
        contentId: String(it.contentId),
        ticketType: String(it.ticketType),
        quantity: Math.max(1, Math.min(10, Number(it.quantity || 1)))
      }));

      // Validate and compute subtotal
      let subtotal = 0;
      const lineDetails: any[] = [];
      for (const it of norm) {
        const content = await storage.getContentById(it.contentId);
        if (!content) return res.status(404).json({ message: `Content not found: ${it.contentId}` });
        const prices: Record<string, number> = {
          standard: Number(content.ticketPriceStandard ?? 0),
          vip: Number(content.ticketPriceVip ?? 0),
          premium: Number(content.ticketPricePremium ?? 0),
        };
        const unit = prices[it.ticketType];
        if (unit == null) return res.status(400).json({ message: `Invalid ticket type for content ${content.title}` });
        const unitCents = Math.round(unit * 100);
        const totalCents = unitCents * it.quantity;
        subtotal += totalCents;
        lineDetails.push({ ...it, unitCents, totalCents, title: content.title });
      }

      // Fees from settings
      const settings = await (storage as any).getSettings?.().catch(() => ({})) || {};
      const feeFixed = Number(settings.feeFixedCents || 0);
      const feePct = Number(settings.feePercent || 0);
      const payFeeFixed = Number(settings.paymentFeeFixedCents || 0);
      const payFeePct = Number(settings.paymentFeePercent || 0);
      const taxPct = Number(settings.taxPercent || 0);

      const serviceFee = Math.round(subtotal * (feePct / 100)) + Math.round(feeFixed);
      const paymentBase = subtotal + serviceFee;
      const paymentFee = Math.round(paymentBase * (payFeePct / 100)) + Math.round(payFeeFixed);
      const tax = Math.round((subtotal + serviceFee + paymentFee) * (taxPct / 100));
      const total = subtotal + serviceFee + paymentFee + tax;

      return res.json({ breakdown: { subtotal, serviceFee, paymentFee, tax, total, currency: 'eur' } });
    } catch (err: any) {
      res.status(500).json({ message: err?.message || 'Quote error' });
    }
  });

  // Receipt API: order group details with items and tickets
  app.get('/api/order-group/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const group = await (storage as any).getOrderGroup(id);
      if (!group) return res.status(404).json({ message: 'Ordine non trovato' });
      const orders = await (storage as any).getOrdersByGroupId(id);
      const tickets = await (storage as any).getTicketsByOrderIds(orders.map((o: any) => o.id));
      // Attach content titles
      const contentCache: Record<string, any> = {};
      for (const o of orders) {
        if (!contentCache[o.content_id]) contentCache[o.content_id] = await storage.getContentById(o.content_id);
      }
      const items = orders.map((o: any) => ({
        id: o.id,
        contentId: o.content_id,
        contentTitle: contentCache[o.content_id]?.title || 'Contenuto',
        ticketType: o.ticket_type,
        quantity: o.quantity,
        totalAmount: o.total_amount,
      }));
      const ticketsOut = tickets.map((t: any) => ({ id: t.id, orderId: t.order_id, contentId: t.content_id, code: t.code }));
      res.json({
        group: {
          id: group.id,
          buyerEmail: group.buyer_email,
          status: group.status,
          amounts: {
            subtotal: group.subtotal_amount,
            serviceFee: group.service_fee_amount,
            paymentFee: group.payment_fee_amount,
            tax: group.tax_amount,
            total: group.total_amount,
            currency: group.currency,
          },
          items,
          tickets: ticketsOut,
        }
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message || 'Errore ricevuta' });
    }
  });

  // QR code image for a ticket code
  app.get('/api/tickets/:code/qr', async (req, res) => {
    try {
      const code = req.params.code;
      if (!code) return res.status(400).send('code richiesto');
      const png = await QRCode.toBuffer(code, { type: 'png', scale: 6, margin: 1 });
      res.setHeader('Content-Type', 'image/png');
      res.send(png);
    } catch (err: any) {
      res.status(500).send('QR generation error');
    }
  });

  // ===== REDEEM ROUTES =====
  app.post('/api/redeem', async (req: any, res) => {
    try {
      const { contentId, code } = req.body || {};
      if (!contentId || !code) return res.status(400).json({ message: 'contentId e code sono obbligatori' });
      let userId: string | undefined;
      try {
        const authHeader = req.headers.authorization?.replace('Bearer ', '');
        if (authHeader) {
          const decoded: any = jwt.verify(authHeader, JWT_SECRET);
          userId = decoded.userId;
        }
      } catch {}
      const redeemed = await (storage as any).redeemTicket(code.trim(), contentId, userId);
      const content = await storage.getContentById(contentId);
      return res.json({ ok: true, ticket: { id: redeemed.id, code: redeemed.code, usedAt: redeemed.used_at }, content });
    } catch (err: any) {
      return res.status(400).json({ message: err?.message || 'Redeem fallito' });
    }
  });

  async function sendTicketsEmail(to: string, content: any, tickets: any[]) {
    const settings = await (storage as any).getSettings?.().catch(() => ({})) || {};
    const smtpHost = settings.smtpHost || process.env.SMTP_HOST;
    const smtpPort = settings.smtpPort ? Number(settings.smtpPort) : (process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined);
    const smtpUser = settings.smtpUser || process.env.SMTP_USER;
    const smtpPass = settings.smtpPass || process.env.SMTP_PASS;
    const appUrl = settings.appUrl || process.env.APP_URL || 'http://localhost:3000';
    if (!(smtpHost && smtpPort && smtpUser && smtpPass)) return;
    const transporter = nodemailer.createTransport({ host: smtpHost, port: smtpPort, secure: smtpPort === 465, auth: { user: smtpUser, pass: smtpPass } });
    const codes = tickets.map(t => t.code).join(', ');
    const html = `
      <p>Grazie per l'acquisto di: <b>${content.title}</b></p>
      <p>Voucher biglietto/i: <b>${codes}</b></p>
      <p>Conserva questi codici, ti serviranno per accedere all'evento.</p>
    `;
    await transporter.sendMail({
      from: settings.smtpFrom || process.env.SMTP_FROM || `no-reply@${new URL(appUrl).hostname}`,
      to,
      subject: `I tuoi biglietti per ${content.title}`,
      text: `Codici biglietto: ${codes}`,
      html,
      attachments: await Promise.all(tickets.map(async (t) => ({
        filename: `ticket-${t.code}.png`,
        content: await QRCode.toBuffer(t.code, { type: 'png', scale: 6, margin: 1 }),
        contentType: 'image/png'
      })))
    });
  }

  async function sendCartTicketsEmail(to: string, orders: any[], tickets: any[]) {
    const settings = await (storage as any).getSettings?.().catch(() => ({})) || {};
    const smtpHost = settings.smtpHost || process.env.SMTP_HOST;
    const smtpPort = settings.smtpPort ? Number(settings.smtpPort) : (process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined);
    const smtpUser = settings.smtpUser || process.env.SMTP_USER;
    const smtpPass = settings.smtpPass || process.env.SMTP_PASS;
    const appUrl = settings.appUrl || process.env.APP_URL || 'http://localhost:3000';
    if (!(smtpHost && smtpPort && smtpUser && smtpPass)) return;
    const transporter = nodemailer.createTransport({ host: smtpHost, port: smtpPort, secure: smtpPort === 465, auth: { user: smtpUser, pass: smtpPass } });
    // Group tickets by content
    const contentMap: Record<string, any> = {};
    for (const o of orders) {
      if (!contentMap[o.content_id]) contentMap[o.content_id] = await storage.getContentById(o.content_id);
    }
    const byContent: Record<string, string[]> = {};
    for (const t of tickets) {
      byContent[t.content_id] = byContent[t.content_id] || [];
      byContent[t.content_id].push(t.code);
    }
    const parts = Object.entries(byContent).map(([cid, codes]) => `<li><b>${contentMap[cid]?.title || 'Contenuto'}:</b> ${codes.join(', ')}</li>`).join('');
    const html = `
      <p>Grazie per il tuo acquisto su <b>VR Theatre</b>.</p>
      <p>Ecco i tuoi voucher:</p>
      <ul>${parts}</ul>
      <p>Conserva questi codici, ti serviranno per accedere agli eventi.</p>
    `;
    const attachments = await Promise.all(tickets.map(async (t) => ({
      filename: `ticket-${t.code}.png`,
      content: await QRCode.toBuffer(t.code, { type: 'png', scale: 6, margin: 1 }),
      contentType: 'image/png'
    })));
    await transporter.sendMail({
      from: settings.smtpFrom || process.env.SMTP_FROM || `no-reply@${new URL(appUrl).hostname}`,
      to,
      subject: `I tuoi biglietti VR Theatre`,
      text: 'Vedi allegati per i QR Code dei biglietti',
      html,
      attachments,
    });
  }

  // ===== ADMIN / DB MANAGEMENT ROUTES =====
  // Admin settings - get/update
  app.get('/api/admin/settings', authMiddleware, async (req: any, res) => {
    try {
      if (!req.user?.isAdmin) return res.status(403).json({ message: 'Forbidden' });
      const settings = await (storage as any).getSettings();
      res.json({ settings });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });
  app.put('/api/admin/settings', authMiddleware, async (req: any, res) => {
    try {
      if (!req.user?.isAdmin) return res.status(403).json({ message: 'Forbidden' });
      const allowedKeys = new Set([
        'companyName','companyEmail','companyAddress','supportEmail','appUrl',
        'smtpHost','smtpPort','smtpUser','smtpPass','smtpFrom',
        'facebookUrl','instagramUrl','twitterUrl','youtubeUrl',
        'requireEmailVerification',
        'feeFixedCents','feePercent','paymentFeeFixedCents','paymentFeePercent','taxPercent'
      ]);
      const incoming: any = {};
      for (const k of Object.keys(req.body || {})) if (allowedKeys.has(k)) incoming[k] = req.body[k];
      const updated = await (storage as any).updateSettings(incoming);
      res.json({ settings: updated });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });
  // Send test email using current (or incoming) SMTP settings
  app.post('/api/admin/settings/test-email', authMiddleware, async (req: any, res) => {
    try {
      if (!req.user?.isAdmin) return res.status(403).json({ message: 'Forbidden' });
      const to: string | undefined = (req.body && req.body.to) || undefined;
      const all = await (storage as any).getSettings();
      const smtpHost = all.smtpHost || process.env.SMTP_HOST;
      const smtpPort = all.smtpPort ? Number(all.smtpPort) : (process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined);
      const smtpUser = all.smtpUser || process.env.SMTP_USER;
      const smtpPass = all.smtpPass || process.env.SMTP_PASS;
      const appUrl = all.appUrl || process.env.APP_URL || 'http://localhost:3000';
      const from = all.smtpFrom || process.env.SMTP_FROM || `no-reply@${new URL(appUrl).hostname}`;
      const recipient = to || all.supportEmail || all.companyEmail || smtpUser;

      if (!(smtpHost && smtpPort && smtpUser && smtpPass)) {
        return res.status(400).json({ message: 'SMTP non configurato (host/port/user/pass)' });
      }
      if (!recipient) return res.status(400).json({ message: 'Nessun destinatario per il test' });

      const transporter = nodemailer.createTransport({ host: smtpHost, port: smtpPort, secure: smtpPort === 465, auth: { user: smtpUser, pass: smtpPass } });
      await transporter.sendMail({
        from,
        to: recipient,
        subject: 'VR Theatre - Test email SMTP',
        text: 'Questa è una email di test dalle Admin Settings di VR Theatre.',
        html: '<p>Questa è una <b>email di test</b> dalle Admin Settings di VR Theatre.</p>',
      });
      res.json({ ok: true, sentTo: recipient });
    } catch (err: any) {
      res.status(500).json({ message: err.message || 'Invio test fallito' });
    }
  });
  // Public settings (read-only subset)
  app.get('/api/settings', async (req: any, res) => {
    try {
      const all = await (storage as any).getSettings();
      const pub = {
        supportEmail: all.supportEmail || null,
        companyEmail: all.companyEmail || null,
        facebookUrl: all.facebookUrl || null,
        instagramUrl: all.instagramUrl || null,
        twitterUrl: all.twitterUrl || null,
        youtubeUrl: all.youtubeUrl || null,
      };
      res.json({ settings: pub });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });
  // GET /api/admin/users - list users (protected, admins only)
  app.get('/api/admin/users', authMiddleware, async (req: any, res) => {
    try {
      if (!req.user?.isAdmin) return res.status(403).json({ message: 'Forbidden' });
      const users = await storage.getAllUsers();
      res.json({ users });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // DELETE /api/admin/users/:id - delete a user (protected)
  app.delete('/api/admin/users/:id', authMiddleware, async (req: any, res) => {
    try {
      if (!req.user?.isAdmin) return res.status(403).json({ message: 'Forbidden' });
      const id = req.params.id;
      await storage.deleteUser(id);
      res.json({ message: 'Deleted' });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  return httpServer;
  // POST /api/admin/promote - Promote a user to admin (admin only)
  app.post('/api/admin/promote', authMiddleware, async (req: any, res: any) => {
    try {
      if (!req.user.isAdmin) return res.status(403).json({ message: 'Only admins can promote users' });
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ message: 'userId required' });
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: 'User not found' });
      await storage.updateUser(userId, { is_admin: 1 });
      res.json({ message: 'User promoted to admin' });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });
}
