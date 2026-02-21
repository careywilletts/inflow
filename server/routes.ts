import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertClientSchema, insertInvoiceSchema, insertScheduleSchema, insertSettingsSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";
import crypto from "crypto";

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      const name = crypto.randomBytes(16).toString("hex");
      cb(null, `${name}${ext}`);
    },
  }),
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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.use("/uploads", express.static(uploadsDir));

  app.get("/api/clients", async (_req, res) => {
    const clients = await storage.getClients();
    res.json(clients);
  });

  app.get("/api/clients/:id", async (req, res) => {
    const client = await storage.getClient(req.params.id);
    if (!client) return res.status(404).json({ message: "Client not found" });
    res.json(client);
  });

  app.post("/api/clients", async (req, res) => {
    const parsed = insertClientSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const client = await storage.createClient(parsed.data);
    res.status(201).json(client);
  });

  app.patch("/api/clients/:id", async (req, res) => {
    const client = await storage.updateClient(req.params.id, req.body);
    if (!client) return res.status(404).json({ message: "Client not found" });
    res.json(client);
  });

  app.delete("/api/clients/:id", async (req, res) => {
    await storage.deleteClient(req.params.id);
    res.status(204).send();
  });

  app.get("/api/invoices", async (_req, res) => {
    const invs = await storage.getInvoices();
    res.json(invs);
  });

  app.get("/api/invoices/:id", async (req, res) => {
    const inv = await storage.getInvoice(req.params.id);
    if (!inv) return res.status(404).json({ message: "Invoice not found" });
    res.json(inv);
  });

  app.post("/api/invoices", async (req, res) => {
    const parsed = insertInvoiceSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const inv = await storage.createInvoice(parsed.data);
    res.status(201).json(inv);
  });

  app.patch("/api/invoices/:id", async (req, res) => {
    const inv = await storage.updateInvoice(req.params.id, req.body);
    if (!inv) return res.status(404).json({ message: "Invoice not found" });
    res.json(inv);
  });

  app.delete("/api/invoices/:id", async (req, res) => {
    await storage.deleteInvoice(req.params.id);
    res.status(204).send();
  });

  app.get("/api/schedules", async (_req, res) => {
    const scheds = await storage.getSchedules();
    res.json(scheds);
  });

  app.get("/api/schedules/:id", async (req, res) => {
    const sched = await storage.getSchedule(req.params.id);
    if (!sched) return res.status(404).json({ message: "Schedule not found" });
    res.json(sched);
  });

  app.post("/api/schedules", async (req, res) => {
    const parsed = insertScheduleSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const sched = await storage.createSchedule(parsed.data);
    res.status(201).json(sched);
  });

  app.patch("/api/schedules/:id", async (req, res) => {
    const sched = await storage.updateSchedule(req.params.id, req.body);
    if (!sched) return res.status(404).json({ message: "Schedule not found" });
    res.json(sched);
  });

  app.delete("/api/schedules/:id", async (req, res) => {
    await storage.deleteSchedule(req.params.id);
    res.status(204).send();
  });

  app.get("/api/settings", async (_req, res) => {
    const s = await storage.getSettings();
    res.json(s || { id: null, logoUrl: null, businessName: null, vatNumber: null, bankName: null, accountName: null, sortCode: null, accountNumber: null });
  });

  app.put("/api/settings", async (req, res) => {
    const parsed = insertSettingsSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const s = await storage.upsertSettings(parsed.data);
    res.json(s);
  });

  app.post("/api/settings/logo", (req, res, next) => {
    upload.single("logo")(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  }, async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const logoUrl = `/uploads/${req.file.filename}`;
    const s = await storage.upsertSettings({ logoUrl });
    res.json(s);
  });

  app.delete("/api/settings/logo", async (_req, res) => {
    const existing = await storage.getSettings();
    if (existing?.logoUrl) {
      const filePath = path.join(uploadsDir, path.basename(existing.logoUrl));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    const s = await storage.upsertSettings({ logoUrl: null });
    res.json(s);
  });

  return httpServer;
}
