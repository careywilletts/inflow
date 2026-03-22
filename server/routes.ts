import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertClientSchema, insertInvoiceSchema, insertScheduleSchema, insertSettingsSchema } from "@shared/schema";
import multer from "multer";
import { sendInvoiceEmail } from "./email";

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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

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

  app.get("/api/invoices/next-number", async (_req, res) => {
    const [allInvoices, settings] = await Promise.all([storage.getInvoices(), storage.getSettings()]);
    const year = new Date().getFullYear();
    const rawPrefix = (settings?.invoicePrefix || "INV").toUpperCase().trim();
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
    const existing = await storage.getInvoice(req.params.id);
    const inv = await storage.updateInvoice(req.params.id, req.body);
    if (!inv) return res.status(404).json({ message: "Invoice not found" });

    if (req.body.status === "sent" && existing?.status !== "sent") {
      const [clients, settings] = await Promise.all([
        storage.getClients(),
        storage.getSettings(),
      ]);
      const client = inv.clientId ? clients.find(c => c.id === inv.clientId) : undefined;
      sendInvoiceEmail(inv, client, settings).then(result => {
        if (!result.success) {
          console.error("[email] Invoice email failed:", result.error);
        } else {
          console.log(`[email] Invoice ${inv.invoiceNumber} emailed successfully`);
        }
      });
    }

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
    res.json(s || { id: null, logoUrl: null, businessName: null, businessEmail: null, businessAddress: null, ccEmail1: null, ccEmail2: null, vatNumber: null, bankName: null, accountName: null, sortCode: null, accountNumber: null, invoicePrefix: null });
  });

  app.put("/api/settings", async (req, res) => {
    const parsed = insertSettingsSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const s = await storage.upsertSettings(parsed.data);
    res.json(s);
  });

  app.post("/api/settings/logo", (req, res, next) => {
    upload.single("logo")(req, res, (err) => {
      if (err) return res.status(400).json({ message: err.message });
      next();
    });
  }, async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const base64 = req.file.buffer.toString("base64");
    const logoUrl = `data:${req.file.mimetype};base64,${base64}`;
    const s = await storage.upsertSettings({ logoUrl });
    res.json(s);
  });

  app.delete("/api/settings/logo", async (_req, res) => {
    const s = await storage.upsertSettings({ logoUrl: null });
    res.json(s);
  });

  return httpServer;
}
