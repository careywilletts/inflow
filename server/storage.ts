import {
  type Client, type InsertClient,
  type Invoice, type InsertInvoice,
  type Schedule, type InsertSchedule,
  type Settings, type InsertSettings,
  type User, type InsertUser,
  clients, invoices, schedules, settings, users
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, isNull, or } from "drizzle-orm";

export interface IStorage {
  // Users
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  createUser(data: InsertUser): Promise<User>;
  claimOrphanedData(userId: string): Promise<void>;

  // Clients
  getClients(userId: string): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(userId: string, data: InsertClient): Promise<Client>;
  updateClient(id: string, data: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: string): Promise<void>;
  nullifyClientReferences(clientId: string): Promise<void>;

  // Invoices
  getInvoices(userId: string): Promise<Invoice[]>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  createInvoice(userId: string, data: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, data: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: string): Promise<void>;

  // Schedules
  getSchedules(userId: string): Promise<Schedule[]>;
  getSchedule(id: string): Promise<Schedule | undefined>;
  createSchedule(userId: string, data: InsertSchedule): Promise<Schedule>;
  updateSchedule(id: string, data: Partial<InsertSchedule>): Promise<Schedule | undefined>;
  deleteSchedule(id: string): Promise<void>;
  deleteSchedulesByInvoiceId(invoiceId: string): Promise<void>;

  // Settings
  getSettings(userId: string): Promise<Settings | undefined>;
  upsertSettings(userId: string, data: Partial<InsertSettings>): Promise<Settings>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return user;
  }
  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async createUser(data: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values({
      ...data,
      email: data.email.toLowerCase(),
    }).returning();
    return user;
  }
  async claimOrphanedData(userId: string): Promise<void> {
    await db.update(clients).set({ userId }).where(isNull(clients.userId));
    await db.update(invoices).set({ userId }).where(isNull(invoices.userId));
    await db.update(schedules).set({ userId }).where(isNull(schedules.userId));
    await db.update(settings).set({ userId }).where(isNull(settings.userId));
  }

  // Clients
  async getClients(userId: string): Promise<Client[]> {
    return db.select().from(clients).where(eq(clients.userId, userId));
  }
  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }
  async createClient(userId: string, data: InsertClient): Promise<Client> {
    const [client] = await db.insert(clients).values({ ...data, userId }).returning();
    return client;
  }
  async updateClient(id: string, data: Partial<InsertClient>): Promise<Client | undefined> {
    const [client] = await db.update(clients).set(data).where(eq(clients.id, id)).returning();
    return client;
  }
  async deleteClient(id: string): Promise<void> {
    await db.delete(clients).where(eq(clients.id, id));
  }
  async nullifyClientReferences(clientId: string): Promise<void> {
    await db.update(invoices).set({ clientId: null }).where(eq(invoices.clientId, clientId));
    await db.update(schedules).set({ clientId: null }).where(eq(schedules.clientId, clientId));
  }

  // Invoices
  async getInvoices(userId: string): Promise<Invoice[]> {
    return db.select().from(invoices).where(eq(invoices.userId, userId)).orderBy(desc(invoices.issueDate));
  }
  async getInvoice(id: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice;
  }
  async createInvoice(userId: string, data: InsertInvoice): Promise<Invoice> {
    const [invoice] = await db.insert(invoices).values({ ...data as any, userId }).returning();
    return invoice;
  }
  async updateInvoice(id: string, data: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const [invoice] = await db.update(invoices).set(data as any).where(eq(invoices.id, id)).returning();
    return invoice;
  }
  async deleteInvoice(id: string): Promise<void> {
    await db.delete(invoices).where(eq(invoices.id, id));
  }

  // Schedules
  async getSchedules(userId: string): Promise<Schedule[]> {
    return db.select().from(schedules).where(eq(schedules.userId, userId)).orderBy(desc(schedules.nextSendDate));
  }
  async getSchedule(id: string): Promise<Schedule | undefined> {
    const [schedule] = await db.select().from(schedules).where(eq(schedules.id, id));
    return schedule;
  }
  async createSchedule(userId: string, data: InsertSchedule): Promise<Schedule> {
    const [schedule] = await db.insert(schedules).values({ ...data as any, userId }).returning();
    return schedule;
  }
  async updateSchedule(id: string, data: Partial<InsertSchedule>): Promise<Schedule | undefined> {
    const [schedule] = await db.update(schedules).set(data as any).where(eq(schedules.id, id)).returning();
    return schedule;
  }
  async deleteSchedule(id: string): Promise<void> {
    await db.delete(schedules).where(eq(schedules.id, id));
  }
  async deleteSchedulesByInvoiceId(invoiceId: string): Promise<void> {
    await db.delete(schedules).where(eq(schedules.invoiceId, invoiceId));
  }

  // Settings
  async getSettings(userId: string): Promise<Settings | undefined> {
    const [row] = await db.select().from(settings).where(eq(settings.userId, userId));
    return row;
  }
  async upsertSettings(userId: string, data: Partial<InsertSettings>): Promise<Settings> {
    const existing = await this.getSettings(userId);
    if (existing) {
      const [updated] = await db.update(settings).set(data).where(eq(settings.id, existing.id)).returning();
      return updated;
    }
    const [created] = await db.insert(settings).values({ ...data as any, userId }).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
