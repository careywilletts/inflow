import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { storage } from "./storage";
import { insertClientSchema, insertInvoiceSchema, insertScheduleSchema, insertSettingsSchema } from "@shared/schema";
import multer from "multer";
import { sendInvoiceEmail, sendVerificationEmail, sendPasswordResetEmail } from "./email";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "image/webp"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PNG, JPEG, and WebP images are allowed"));
    }
  },
});

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Unauthorised" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ── Auth routes ────────────────────────────────────────────────────────────

  app.post("/api/auth/register", async (req, res) => {
    const { email, password, businessName } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password are required" });
    if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });

    const existing = await storage.getUserByEmail(email);
    if (existing) return res.status(409).json({ message: "An account with this email already exists" });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await storage.createUser({ email, passwordHash, businessName: businessName || null });

    // First user to register claims any existing orphaned data
    await storage.claimOrphanedData(user.id);

    // Save business name to settings if provided
    if (businessName) {
      await storage.upsertSettings(user.id, { businessName, businessEmail: email });
    }

    // Generate and send verification email
    const token = crypto.randomBytes(32).toString("hex");
    await storage.setVerificationToken(user.id, token);
    const proto = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const verificationUrl = `${proto}://${host}/verify-email?token=${token}`;
    sendVerificationEmail(email, verificationUrl).catch(err =>
      console.error("[email] Verification email failed:", err)
    );

    req.session.userId = user.id;
    req.session.save(() => {
      res.status(201).json({ id: user.id, email: user.email, emailVerified: false });
    });
  });

  app.get("/api/auth/verify-email", async (req, res) => {
    const { token } = req.query;
    if (!token || typeof token !== "string") {
      return res.status(400).json({ message: "Invalid token" });
    }
    const user = await storage.verifyUserByToken(token);
    if (!user) return res.status(400).json({ message: "Invalid or expired verification link" });
    // If user is logged in, update their session
    if (req.session.userId === user.id) {
      // session already set, just return success
    }
    res.json({ success: true, email: user.email });
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });
    // Always return success to avoid revealing whether an account exists
    const user = await storage.getUserByEmail(email);
    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await storage.setResetToken(user.id, token, expiry);
      const proto = req.headers["x-forwarded-proto"] || req.protocol;
      const host = req.headers["x-forwarded-host"] || req.headers.host;
      const resetUrl = `${proto}://${host}/reset-password?token=${token}`;
      sendPasswordResetEmail(user.email, resetUrl).catch(err =>
        console.error("[email] Password reset email failed:", err)
      );
    }
    res.json({ success: true });
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: "Token and password are required" });
    if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });

    const user = await storage.getUserByResetToken(token);
    if (!user) return res.status(400).json({ message: "This reset link is invalid or has already been used" });
    if (!user.resetTokenExpiry || new Date() > new Date(user.resetTokenExpiry)) {
      return res.status(400).json({ message: "This reset link has expired. Please request a new one" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await storage.updatePassword(user.id, passwordHash);
    res.json({ success: true });
  });

  app.post("/api/auth/resend-verification", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Not authenticated" });
    const user = await storage.getUserById(req.session.userId);
    if (!user) return res.status(401).json({ message: "Not authenticated" });
    if (user.emailVerified) return res.status(400).json({ message: "Email already verified" });

    const token = crypto.randomBytes(32).toString("hex");
    await storage.setVerificationToken(user.id, token);
    const proto = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const verificationUrl = `${proto}://${host}/verify-email?token=${token}`;
    await sendVerificationEmail(user.email, verificationUrl);
    res.json({ success: true });
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password are required" });

    const user = await storage.getUserByEmail(email);
    if (!user) return res.status(401).json({ message: "Invalid email or password" });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ message: "Invalid email or password" });

    req.session.userId = user.id;
    req.session.save(() => {
      res.json({ id: user.id, email: user.email, emailVerified: user.emailVerified });
    });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.status(204).send();
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Not authenticated" });
    const user = await storage.getUserById(req.session.userId);
    if (!user) return res.status(401).json({ message: "Not authenticated" });
    res.json({ id: user.id, email: user.email, emailVerified: user.emailVerified });
  });

  // ── Clients ────────────────────────────────────────────────────────────────

  app.get("/api/clients", requireAuth, async (req, res) => {
    const data = await storage.getClients(req.session.userId!);
    res.json(data);
  });

  app.get("/api/clients/:id", requireAuth, async (req, res) => {
    const client = await storage.getClient(req.params.id);
    if (!client) return res.status(404).json({ message: "Client not found" });
    res.json(client);
  });

  app.post("/api/clients", requireAuth, async (req, res) => {
    const parsed = insertClientSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const client = await storage.createClient(req.session.userId!, parsed.data);
    res.status(201).json(client);
  });

  app.patch("/api/clients/:id", requireAuth, async (req, res) => {
    const client = await storage.updateClient(req.params.id, req.body);
    if (!client) return res.status(404).json({ message: "Client not found" });
    res.json(client);
  });

  app.delete("/api/clients/:id", requireAuth, async (req, res) => {
    await storage.nullifyClientReferences(req.params.id);
    await storage.deleteClient(req.params.id);
    res.status(204).send();
  });

  // ── Invoices ───────────────────────────────────────────────────────────────

  app.get("/api/invoices", requireAuth, async (req, res) => {
    const invs = await storage.getInvoices(req.session.userId!);
    res.json(invs);
  });

  app.get("/api/invoices/next-number", requireAuth, async (req, res) => {
    const [allInvoices, s] = await Promise.all([
      storage.getInvoices(req.session.userId!),
      storage.getSettings(req.session.userId!),
    ]);
    const year = new Date().getFullYear();
    const rawPrefix = (s?.invoicePrefix || "INV").toUpperCase().trim();
    const prefix = `${rawPrefix}-${year}-`;
    let maxSeq = 0;
    for (const inv of allInvoices) {
      if (inv.invoiceNumber.startsWith(prefix)) {
        const seq = parseInt(inv.invoiceNumber.slice(prefix.length), 10);
        if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
      }
    }
    const next = String(maxSeq + 1).padStart(3, "0");
    res.json({ invoiceNumber: `${prefix}${next}` });
  });

  app.get("/api/invoices/:id", requireAuth, async (req, res) => {
    const inv = await storage.getInvoice(req.params.id);
    if (!inv) return res.status(404).json({ message: "Invoice not found" });
    res.json(inv);
  });

  app.post("/api/invoices", requireAuth, async (req, res) => {
    const parsed = insertInvoiceSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const inv = await storage.createInvoice(req.session.userId!, parsed.data);
    res.status(201).json(inv);
  });

  app.patch("/api/invoices/:id", requireAuth, async (req, res) => {
    const existing = await storage.getInvoice(req.params.id);
    const body = { ...req.body };
    if (body.issueDate) body.issueDate = new Date(body.issueDate);
    if (body.dueDate) body.dueDate = new Date(body.dueDate);
    const inv = await storage.updateInvoice(req.params.id, body);
    if (!inv) return res.status(404).json({ message: "Invoice not found" });

    if (req.body.status === "sent" && existing?.status !== "sent") {
      const [allClients, s] = await Promise.all([
        storage.getClients(req.session.userId!),
        storage.getSettings(req.session.userId!),
      ]);
      const client = inv.clientId ? allClients.find(c => c.id === inv.clientId) : undefined;
      sendInvoiceEmail(inv, client, s).then(result => {
        if (!result.success) {
          console.error("[email] Invoice email failed:", result.error);
        } else {
          console.log(`[email] Invoice ${inv.invoiceNumber} emailed successfully`);
        }
      });
    }

    res.json(inv);
  });

  app.delete("/api/invoices/:id", requireAuth, async (req, res) => {
    await storage.deleteSchedulesByInvoiceId(req.params.id);
    await storage.deleteInvoice(req.params.id);
    res.status(204).send();
  });

  // ── Schedules ──────────────────────────────────────────────────────────────

  app.get("/api/schedules", requireAuth, async (req, res) => {
    const scheds = await storage.getSchedules(req.session.userId!);
    res.json(scheds);
  });

  app.get("/api/schedules/:id", requireAuth, async (req, res) => {
    const sched = await storage.getSchedule(req.params.id);
    if (!sched) return res.status(404).json({ message: "Schedule not found" });
    res.json(sched);
  });

  app.post("/api/schedules", requireAuth, async (req, res) => {
    const parsed = insertScheduleSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const sched = await storage.createSchedule(req.session.userId!, parsed.data);
    res.status(201).json(sched);
  });

  app.patch("/api/schedules/:id", requireAuth, async (req, res) => {
    const sched = await storage.updateSchedule(req.params.id, req.body);
    if (!sched) return res.status(404).json({ message: "Schedule not found" });
    res.json(sched);
  });

  app.delete("/api/schedules/:id", requireAuth, async (req, res) => {
    await storage.deleteSchedule(req.params.id);
    res.status(204).send();
  });

  // ── Settings ───────────────────────────────────────────────────────────────

  app.get("/api/settings", requireAuth, async (req, res) => {
    const s = await storage.getSettings(req.session.userId!);
    res.json(s || {
      id: null, userId: req.session.userId,
      logoUrl: null, businessName: null, businessEmail: null,
      businessAddress: null, ccEmail1: null, ccEmail2: null,
      vatNumber: null, bankName: null, accountName: null,
      sortCode: null, accountNumber: null, invoicePrefix: null
    });
  });

  app.put("/api/settings", requireAuth, async (req, res) => {
    const parsed = insertSettingsSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const s = await storage.upsertSettings(req.session.userId!, parsed.data);
    res.json(s);
  });

  app.post("/api/settings/logo", requireAuth, (req, res, next) => {
    upload.single("logo")(req, res, (err) => {
      if (err) return res.status(400).json({ message: err.message });
      next();
    });
  }, async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const base64 = req.file.buffer.toString("base64");
    const logoUrl = `data:${req.file.mimetype};base64,${base64}`;
    const s = await storage.upsertSettings(req.session.userId!, { logoUrl });
    res.json(s);
  });

  app.delete("/api/settings/logo", requireAuth, async (req, res) => {
    const s = await storage.upsertSettings(req.session.userId!, { logoUrl: null });
    res.json(s);
  });

  return httpServer;
}
