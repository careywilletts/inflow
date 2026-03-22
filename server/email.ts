import nodemailer from "nodemailer";
import type { Invoice, Client, Settings, LineItem } from "@shared/schema";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

function formatCurrency(amount: number, currency: string = "GBP"): string {
  const locale = currency === "GBP" ? "en-GB" : currency === "EUR" ? "de-DE" : "en-US";
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
}

function buildInvoiceHtml(invoice: Invoice, client: Client | undefined, settings: Settings | null, logoHasCid: boolean): string {
  const lineItems = invoice.lineItems as LineItem[];
  const businessName = settings?.businessName || invoice.fromName || "Inflo";
  const logoSrc = logoHasCid ? "cid:invoice-logo" : null;

  const lineItemRows = lineItems.map(item => `
    <tr>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e8e4d9;">
        <strong>${item.name || item.description || "Item"}</strong>
        ${item.name && item.description ? `<br><span style="color:#7a7565;font-size:13px;">${item.description}</span>` : ""}
      </td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e8e4d9; text-align: right; white-space: nowrap;">${item.quantity}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e8e4d9; text-align: right; white-space: nowrap;">${formatCurrency(Number(item.rate), invoice.currency)}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e8e4d9; text-align: right; white-space: nowrap; font-weight: 600;">${formatCurrency(item.quantity * Number(item.rate), invoice.currency)}</td>
    </tr>
  `).join("");

  const dueDate = new Date(invoice.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const issueDate = new Date(invoice.issueDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f2eb;font-family:'Helvetica Neue',Arial,sans-serif;color:#2c2a24;">
  <div style="max-width:620px;margin:32px auto;background:#fffdf8;border:2px solid #2c2a24;">
    
    <!-- Header -->
    <div style="padding:28px 32px;border-bottom:2px solid #2c2a24;display:flex;align-items:center;justify-content:space-between;">
      <div style="display:flex;align-items:center;gap:14px;">
        ${logoSrc ? `<img src="${logoSrc}" alt="Logo" style="width:48px;height:48px;object-fit:contain;border-radius:50%;border:2px solid #7a8c3a;">` : `<div style="width:48px;height:48px;border-radius:50%;background:#e8d5cc;border:2px solid #7a8c3a;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:18px;color:#7a8c3a;">IN</div>`}
        <div>
          <div style="font-weight:700;font-size:18px;letter-spacing:-0.5px;">${businessName}</div>
          ${settings?.vatNumber ? `<div style="font-size:12px;color:#7a7565;">VAT: ${settings.vatNumber}</div>` : ""}
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#7a7565;">Invoice</div>
        <div style="font-size:20px;font-weight:700;letter-spacing:-0.5px;">${invoice.invoiceNumber}</div>
      </div>
    </div>

    <!-- From / To -->
    <div style="padding:24px 32px;border-bottom:2px solid #e8e4d9;display:grid;grid-template-columns:1fr 1fr;gap:24px;">
      <div>
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#7a7565;margin-bottom:6px;">From</div>
        <div style="font-weight:600;">${invoice.fromName || businessName}</div>
        ${invoice.fromEmail ? `<div style="color:#7a7565;font-size:14px;">${invoice.fromEmail}</div>` : ""}
        ${invoice.fromAddress ? `<div style="color:#7a7565;font-size:14px;white-space:pre-line;">${invoice.fromAddress}</div>` : ""}
      </div>
      <div>
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#7a7565;margin-bottom:6px;">To</div>
        ${client ? `
          <div style="font-weight:600;">${client.name}</div>
          ${client.company ? `<div style="color:#7a7565;font-size:14px;">${client.company}</div>` : ""}
          <div style="color:#7a7565;font-size:14px;">${client.email}</div>
          ${client.address ? `<div style="color:#7a7565;font-size:14px;white-space:pre-line;">${client.address}</div>` : ""}
        ` : "<div style='color:#7a7565;font-size:14px;'>No client assigned</div>"}
      </div>
    </div>

    <!-- Dates -->
    <div style="padding:16px 32px;border-bottom:2px solid #e8e4d9;display:flex;gap:40px;">
      <div>
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#7a7565;margin-bottom:2px;">Issue Date</div>
        <div style="font-weight:600;">${issueDate}</div>
      </div>
      <div>
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#7a7565;margin-bottom:2px;">Due Date</div>
        <div style="font-weight:600;">${dueDate}</div>
      </div>
    </div>

    <!-- Line items -->
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:#f0ece0;">
          <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#7a7565;">Product / Service</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#7a7565;">Qty</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#7a7565;">Unit Cost</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#7a7565;">Amount</th>
        </tr>
      </thead>
      <tbody>${lineItemRows}</tbody>
    </table>

    <!-- Totals -->
    <div style="padding:16px 32px;border-top:2px solid #2c2a24;">
      <div style="display:flex;justify-content:flex-end;">
        <div style="width:220px;">
          <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:14px;">
            <span style="color:#7a7565;">Subtotal</span>
            <span>${formatCurrency(Number(invoice.subtotal), invoice.currency)}</span>
          </div>
          ${Number(invoice.taxRate) > 0 ? `
          <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:14px;">
            <span style="color:#7a7565;">VAT (${invoice.taxRate}%)</span>
            <span>${formatCurrency(Number(invoice.taxAmount), invoice.currency)}</span>
          </div>
          ` : ""}
          <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:17px;font-weight:700;border-top:2px solid #2c2a24;margin-top:4px;">
            <span>Total</span>
            <span>${formatCurrency(Number(invoice.total), invoice.currency)}</span>
          </div>
        </div>
      </div>
    </div>

    ${invoice.notes ? `
    <div style="padding:16px 32px;border-top:2px solid #e8e4d9;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#7a7565;margin-bottom:6px;">Notes</div>
      <div style="font-size:14px;color:#7a7565;white-space:pre-line;">${invoice.notes}</div>
    </div>
    ` : ""}

    ${settings?.bankName || settings?.sortCode ? `
    <div style="padding:16px 32px;border-top:2px solid #e8e4d9;background:#f0ece0;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#7a7565;margin-bottom:6px;">Bank Details</div>
      <div style="font-size:14px;">
        ${settings.bankName ? `<span style="font-weight:600;">${settings.bankName}</span>` : ""}
        ${settings.accountName ? ` &middot; ${settings.accountName}` : ""}
        ${settings.sortCode ? `<br>Sort Code: ${settings.sortCode}` : ""}
        ${settings.accountNumber ? ` &middot; Account: ${settings.accountNumber}` : ""}
      </div>
    </div>
    ` : ""}

    <!-- Footer -->
    <div style="padding:16px 32px;border-top:2px solid #2c2a24;text-align:center;font-size:12px;color:#7a7565;">
      Sent via Inflo &mdash; Smart Invoice Automation
    </div>
  </div>
</body>
</html>
  `.trim();
}

export async function sendInvoiceEmail(
  invoice: Invoice,
  client: Client | undefined,
  settings: Settings | null
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return { success: false, error: "Gmail credentials not configured" };
  }

  const businessName = settings?.businessName || invoice.fromName || "Inflo";
  const toEmail = client?.email;
  const ccAddresses = [
    settings?.businessEmail,
    settings?.ccEmail1,
    settings?.ccEmail2,
  ].filter(Boolean) as string[];

  if (!toEmail && ccAddresses.length === 0) {
    return { success: false, error: "No recipient email address available" };
  }

  // Extract logo for CID embedding if it's a base64 data URL
  let logoAttachment: { filename: string; content: Buffer; contentType: string; cid: string; } | null = null;
  const logoUrl = settings?.logoUrl || "";
  if (logoUrl.startsWith("data:")) {
    const matches = logoUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      const contentType = matches[1];
      const ext = contentType.split("/")[1] || "png";
      logoAttachment = {
        filename: `logo.${ext}`,
        content: Buffer.from(matches[2], "base64"),
        contentType,
        cid: "invoice-logo",
      };
    }
  }

  const html = buildInvoiceHtml(invoice, client, settings, !!logoAttachment);
  const subject = `Invoice ${invoice.invoiceNumber} from ${businessName}`;

  try {
    await transporter.sendMail({
      from: `"${businessName}" <${process.env.GMAIL_USER}>`,
      to: toEmail || ccAddresses[0],
      cc: ccAddresses.length > 0 ? ccAddresses.join(", ") : undefined,
      subject,
      html,
      attachments: logoAttachment ? [{ ...logoAttachment, contentDisposition: "inline" }] : undefined,
    });
    return { success: true };
  } catch (err: any) {
    console.error("[email] Failed to send invoice email:", err.message);
    return { success: false, error: err.message };
  }
}
