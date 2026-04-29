import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, numeric, boolean, timestamp, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  emailVerified: boolean("email_verified").notNull().default(false),
  verificationToken: text("verification_token"),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  businessName: text("business_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, emailVerified: true, verificationToken: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  name: text("name").notNull(),
  email: text("email").notNull(),
  company: text("company"),
  address: text("address"),
  phone: text("phone"),
  notes: text("notes"),
});

export const insertClientSchema = createInsertSchema(clients).omit({ id: true, userId: true });
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

export const lineItemSchema = z.object({
  name: z.string().optional().default(""),
  description: z.string(),
  quantity: z.number().min(0),
  rate: z.number().min(0),
});
export type LineItem = z.infer<typeof lineItemSchema>;

export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
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
}, (table) => ({
  uniqueUserInvoiceNumber: uniqueIndex("invoices_user_invoice_number_unique").on(table.userId, table.invoiceNumber),
}));

export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, userId: true }).extend({
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required"),
  dueDate: z.coerce.date(),
  issueDate: z.coerce.date(),
});
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;

export const schedules = pgTable("schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  invoiceId: varchar("invoice_id").references(() => invoices.id),
  clientId: varchar("client_id").references(() => clients.id),
  frequency: text("frequency").notNull(),
  nextSendDate: timestamp("next_send_date").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  lastSentDate: timestamp("last_sent_date"),
});

export const insertScheduleSchema = createInsertSchema(schedules).omit({ id: true, userId: true }).extend({
  nextSendDate: z.coerce.date(),
  lastSentDate: z.coerce.date().optional().nullable(),
});
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type Schedule = typeof schedules.$inferSelect;

export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).unique(),
  logoUrl: text("logo_url"),
  businessName: text("business_name"),
  businessEmail: text("business_email"),
  businessAddress: text("business_address"),
  ccEmail1: text("cc_email_1"),
  ccEmail2: text("cc_email_2"),
  vatNumber: text("vat_number"),
  bankName: text("bank_name"),
  accountName: text("account_name"),
  sortCode: text("sort_code"),
  accountNumber: text("account_number"),
  invoicePrefix: text("invoice_prefix"),
});

export const insertSettingsSchema = createInsertSchema(settings).omit({ id: true, userId: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settings.$inferSelect;
