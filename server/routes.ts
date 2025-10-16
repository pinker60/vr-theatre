
import type { Express } from "express";
import { createServer, type Server } from "http";
import { randomUUID } from 'crypto';
import { storage } from "./storage";
import bcrypt from "bcrypt";
import nodemailer from 'nodemailer';
import jwt from "jsonwebtoken";
import Stripe from "stripe";
import { insertUserSchema, insertContentSchema } from "../shared/schema";
import { fromZodError } from "zod-validation-error";
import { Readable } from "stream";

// JWT Secret - mandatory environment variable for security
if (!process.env.JWT_SECRET) {
  throw new Error(
    'CRITICAL SECURITY ERROR: JWT_SECRET environment variable is required but not set.\n' +
    'Generate a secure secret with: openssl rand -hex 32\n' +
    'Then add it to your .env file: JWT_SECRET=<your-secret>'
  );
}
const JWT_SECRET = process.env.JWT_SECRET;

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
      });

      // Generate JWT for immediate client use (optional)
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

      // Send verification email (best-effort)
      try {
        // Configure transporter from env
        const smtpHost = process.env.SMTP_HOST;
        const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASS;
        const appUrl = process.env.APP_URL || 'http://localhost:3000';

        if (smtpHost && smtpPort && smtpUser && smtpPass) {
          const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465, // true for 465, false for other ports
            auth: { user: smtpUser, pass: smtpPass },
          });

          const verifyLink = `${appUrl}/api/auth/verify?token=${encodeURIComponent(verificationToken)}`;

          await transporter.sendMail({
            from: process.env.SMTP_FROM || `no-reply@${new URL(appUrl).hostname}`,
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

      const updatedUser = await storage.updateUser(req.params.id, {
        name,
        theater,
        avatar,
        preferences,
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

      // Map validated camelCase fields to snake_case for storage
      const v = validation.data as any;
      const dbPayload: any = {
        ...v,
        image_url: v.imageUrl,
        vr_url: v.vrUrl,
        tags: v.tags,
        createdBy: v.createdBy,
      };

      // Remove camelCase duplicates to avoid confusion in storage layer
      delete dbPayload.imageUrl;
      delete dbPayload.vrUrl;

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
      const allowed = ['title', 'description', 'image_url', 'duration', 'tags', 'vr_url'];
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

  // ===== ADMIN / DB MANAGEMENT ROUTES =====
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
