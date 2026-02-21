import { db } from "./db";
import { clients, invoices, schedules } from "@shared/schema";
import { sql } from "drizzle-orm";

export async function seedDatabase() {
  const existingClients = await db.select().from(clients);
  if (existingClients.length > 0) return;

  const [client1, client2, client3] = await db.insert(clients).values([
    {
      name: "Sarah Mitchell",
      email: "sarah@brightcreative.com",
      company: "Bright Creative Studio",
      address: "142 Design Ave, Brooklyn, NY 11201",
      phone: "+1 (718) 555-0192",
      notes: "Preferred contact via email. Net 30 terms.",
    },
    {
      name: "Marcus Chen",
      email: "marcus@techforge.io",
      company: "TechForge Solutions",
      address: "890 Innovation Blvd, San Francisco, CA 94107",
      phone: "+1 (415) 555-0287",
      notes: "Monthly retainer client.",
    },
    {
      name: "Elena Rodriguez",
      email: "elena@greenleaf.co",
      company: "GreenLeaf Organics",
      address: "55 Harvest Lane, Austin, TX 78701",
      phone: "+1 (512) 555-0341",
      notes: "Quarterly invoicing preferred.",
    },
  ]).returning();

  const [inv1, inv2, inv3, inv4] = await db.insert(invoices).values([
    {
      invoiceNumber: "INV-2026-001",
      clientId: client1.id,
      status: "paid",
      issueDate: new Date("2026-01-15"),
      dueDate: new Date("2026-02-14"),
      lineItems: [
        { description: "Brand Identity Design", quantity: 1, rate: 4500 },
        { description: "Website Mockups (5 pages)", quantity: 5, rate: 800 },
        { description: "Social Media Kit", quantity: 1, rate: 1200 },
      ],
      subtotal: "9700.00",
      taxRate: "8.00",
      taxAmount: "776.00",
      total: "10476.00",
      fromName: "Alex Johnson",
      fromEmail: "alex@inflostudio.com",
      fromAddress: "320 Market St, Suite 200\nNew York, NY 10002",
      notes: "Thank you for your business! Payment received on Feb 10.",
      currency: "USD",
    },
    {
      invoiceNumber: "INV-2026-002",
      clientId: client2.id,
      status: "sent",
      issueDate: new Date("2026-02-01"),
      dueDate: new Date("2026-03-03"),
      lineItems: [
        { description: "Cloud Infrastructure Setup", quantity: 1, rate: 6000 },
        { description: "Monthly DevOps Support", quantity: 1, rate: 3500 },
        { description: "Security Audit", quantity: 1, rate: 2800 },
      ],
      subtotal: "12300.00",
      taxRate: "8.50",
      taxAmount: "1045.50",
      total: "13345.50",
      fromName: "Alex Johnson",
      fromEmail: "alex@inflostudio.com",
      fromAddress: "320 Market St, Suite 200\nNew York, NY 10002",
      notes: "Net 30 payment terms apply. Contact us for any questions.",
      currency: "USD",
    },
    {
      invoiceNumber: "INV-2026-003",
      clientId: client3.id,
      status: "draft",
      issueDate: new Date("2026-02-18"),
      dueDate: new Date("2026-03-20"),
      lineItems: [
        { description: "Product Photography (50 items)", quantity: 50, rate: 75 },
        { description: "Photo Editing & Retouching", quantity: 50, rate: 25 },
      ],
      subtotal: "5000.00",
      taxRate: "6.25",
      taxAmount: "312.50",
      total: "5312.50",
      fromName: "Alex Johnson",
      fromEmail: "alex@inflostudio.com",
      fromAddress: "320 Market St, Suite 200\nNew York, NY 10002",
      notes: "Draft - pending product delivery confirmation.",
      currency: "USD",
    },
    {
      invoiceNumber: "INV-2026-004",
      clientId: client1.id,
      status: "overdue",
      issueDate: new Date("2026-01-05"),
      dueDate: new Date("2026-02-04"),
      lineItems: [
        { description: "UI/UX Consultation", quantity: 8, rate: 200 },
        { description: "Prototype Development", quantity: 1, rate: 3000 },
      ],
      subtotal: "4600.00",
      taxRate: "8.00",
      taxAmount: "368.00",
      total: "4968.00",
      fromName: "Alex Johnson",
      fromEmail: "alex@inflostudio.com",
      fromAddress: "320 Market St, Suite 200\nNew York, NY 10002",
      notes: "Payment overdue. Please settle at your earliest convenience.",
      currency: "USD",
    },
  ]).returning();

  await db.insert(schedules).values([
    {
      invoiceId: inv2.id,
      clientId: client2.id,
      frequency: "monthly",
      nextSendDate: new Date("2026-03-01"),
      isActive: true,
    },
    {
      invoiceId: inv3.id,
      clientId: client3.id,
      frequency: "yearly",
      nextSendDate: new Date("2027-02-18"),
      isActive: true,
    },
  ]);

  console.log("Database seeded successfully");
}
