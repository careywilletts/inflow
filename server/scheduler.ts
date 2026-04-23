import { storage } from "./storage";
import { sendInvoiceEmail } from "./email";

function log(message: string) {
  const t = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });
  console.log(`${t} [scheduler] ${message}`);
}

function addPeriod(date: Date, frequency: string): Date {
  const d = new Date(date);
  if (frequency === "weekly") d.setDate(d.getDate() + 7);
  else if (frequency === "monthly") d.setMonth(d.getMonth() + 1);
  else if (frequency === "quarterly") d.setMonth(d.getMonth() + 3);
  else if (frequency === "yearly") d.setFullYear(d.getFullYear() + 1);
  return d;
}

function nextInvoiceNumber(existing: string[], prefix: string): string {
  const year = new Date().getFullYear();
  const fullPrefix = `${prefix}-${year}-`;
  let maxSeq = 0;
  for (const num of existing) {
    if (num.startsWith(fullPrefix)) {
      const seq = parseInt(num.slice(fullPrefix.length), 10);
      if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
  }
  return `${fullPrefix}${String(maxSeq + 1).padStart(3, "0")}`;
}

async function processSchedule(schedule: Awaited<ReturnType<typeof storage.getDueSchedules>>[number]) {
  try {
    const template = await storage.getInvoice(schedule.invoiceId!);
    if (!template || !template.userId) return;

    const [client, userSettings, allInvoices] = await Promise.all([
      schedule.clientId ? storage.getClient(schedule.clientId) : Promise.resolve(undefined),
      storage.getSettings(template.userId),
      storage.getInvoices(template.userId),
    ]);

    const prefix = (userSettings?.invoicePrefix || "INV").toUpperCase().trim();
    const allNumbers = allInvoices.map(i => i.invoiceNumber);
    const invoiceNumber = nextInvoiceNumber(allNumbers, prefix);

    const today = new Date();
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + 7);

    const newInvoice = await storage.createInvoice(template.userId, {
      invoiceNumber,
      clientId: schedule.clientId ?? null,
      status: "sent",
      issueDate: today,
      dueDate,
      lineItems: template.lineItems as any,
      subtotal: template.subtotal,
      taxRate: template.taxRate,
      taxAmount: template.taxAmount,
      total: template.total,
      notes: template.notes,
      fromName: template.fromName,
      fromEmail: template.fromEmail,
      fromAddress: template.fromAddress,
      currency: template.currency,
    });

    const result = await sendInvoiceEmail(newInvoice, client, userSettings ?? null);
    if (!result.success) {
      log(`Email failed for schedule ${schedule.id}: ${result.error}`);
    } else {
      log(`Sent invoice ${invoiceNumber} for schedule ${schedule.id}`);
    }

    const nextDate = addPeriod(schedule.nextSendDate!, schedule.frequency);
    await storage.updateSchedule(schedule.id, {
      lastSentDate: today,
      nextSendDate: nextDate,
    });
  } catch (err) {
    log(`Error processing schedule ${schedule.id}: ${err}`);
  }
}

export async function runScheduler() {
  try {
    const due = await storage.getDueSchedules();
    if (due.length === 0) return;
    log(`Found ${due.length} due schedule(s)`);
    for (const schedule of due) {
      await processSchedule(schedule);
    }
  } catch (err) {
    log(`Error: ${err}`);
  }
}

export function startScheduler() {
  runScheduler();
  setInterval(runScheduler, 60 * 60 * 1000);
  log("Scheduler started (runs hourly)");
}
