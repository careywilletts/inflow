import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, numeric, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  company: text("company"),
  address: text("address"),
  phone: text("phone"),
  notes: text("notes"),
});

export const insertClientSchema = createInsertSchema(clients).omit({ id: true });
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

export const lineItemSchema = z.object({
  description: z.string(),
  quantity: z.number().min(0),
  rate: z.number().min(0),
});
export type LineItem = z.infer<typeof lineItemSchema>;

export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceNumber: text("invoice_number").notNull(),
  clientId: varchar("client_id").references(() => clients.id),
  status: text("status").notNull().default("draft"),
  issueDate: timestamp("issue_date").notNull().defaultNow(),
  dueDate: timestamp("due_date").notNull(),
  lineItems: jsonb("line_items").notNull().$type<LineItem[]>(),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  fromName: text("from_name"),
  fromEmail: text("from_email"),
  fromAddress: text("from_address"),
  currency: text("currency").notNull().default("GBP"),
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true }).extend({
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required"),
  dueDate: z.coerce.date(),
  issueDate: z.coerce.date(),
});
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;

export const schedules = pgTable("schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").references(() => invoices.id),
  clientId: varchar("client_id").references(() => clients.id),
  frequency: text("frequency").notNull(),
  nextSendDate: timestamp("next_send_date").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  lastSentDate: timestamp("last_sent_date"),
});

export const insertScheduleSchema = createInsertSchema(schedules).omit({ id: true }).extend({
  nextSendDate: z.coerce.date(),
  lastSentDate: z.coerce.date().optional().nullable(),
});
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type Schedule = typeof schedules.$inferSelect;

export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  logoUrl: text("logo_url"),
  businessName: text("business_name"),
});

export const insertSettingsSchema = createInsertSchema(settings).omit({ id: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settings.$inferSelect;
