import PDFDocument from "pdfkit";
import type { Invoice, Client, Settings, LineItem } from "@shared/schema";

function formatCurrency(amount: number, currency: string = "GBP"): string {
  const locale = currency === "GBP" ? "en-GB" : currency === "EUR" ? "de-DE" : "en-US";
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
}

export async function generateInvoicePdf(
  invoice: Invoice,
  client: Client | undefined,
  settings: Settings | null
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const lineItems = invoice.lineItems as LineItem[];
    const businessName = settings?.businessName || invoice.fromName || "Inflow";
    const primaryColor = "#5a6e1a";
    const mutedColor = "#7a7565";
    const borderColor = "#2c2a24";
    const bgLight = "#f0ece0";
    const pageWidth = doc.page.width - 100;

    // ── Logo + business name + invoice number header ──
    let headerY = 50;

    // Logo
    let logoWidth = 0;
    if (settings?.logoUrl?.startsWith("data:")) {
      try {
        const matches = settings.logoUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          const imgBuffer = Buffer.from(matches[2], "base64");
          doc.image(imgBuffer, 50, headerY, { width: 56, height: 56, fit: [56, 56] });
          logoWidth = 68;
        }
      } catch {
        // skip logo if it fails
      }
    }

    // Business name & VAT
    doc
      .font("Helvetica-Bold")
      .fontSize(16)
      .fillColor(borderColor)
      .text(businessName, 50 + logoWidth, headerY + 4, { width: pageWidth - logoWidth - 120 });

    if (settings?.vatNumber) {
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(mutedColor)
        .text(`VAT: ${settings.vatNumber}`, 50 + logoWidth, headerY + 26, { width: pageWidth - logoWidth - 120 });
    }

    // Invoice label + number (top right)
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(mutedColor)
      .text("INVOICE", 50 + pageWidth - 120, headerY, { width: 120, align: "right" });

    doc
      .font("Helvetica-Bold")
      .fontSize(16)
      .fillColor(borderColor)
      .text(invoice.invoiceNumber, 50 + pageWidth - 120, headerY + 14, { width: 120, align: "right" });

    // Divider
    doc
      .moveTo(50, headerY + 66)
      .lineTo(50 + pageWidth, headerY + 66)
      .lineWidth(1.5)
      .strokeColor(borderColor)
      .stroke();

    // ── From / To ──
    const fromToY = headerY + 82;
    const colW = pageWidth / 2 - 10;

    doc.font("Helvetica-Bold").fontSize(8).fillColor(mutedColor)
      .text("FROM", 50, fromToY);
    doc.font("Helvetica-Bold").fontSize(10).fillColor(borderColor)
      .text(invoice.fromName || businessName, 50, fromToY + 14, { width: colW });
    doc.font("Helvetica").fontSize(9).fillColor(mutedColor);
    if (invoice.fromEmail) doc.text(invoice.fromEmail, 50, doc.y, { width: colW });
    if (invoice.fromAddress) doc.text(invoice.fromAddress, 50, doc.y, { width: colW });

    doc.font("Helvetica-Bold").fontSize(8).fillColor(mutedColor)
      .text("TO", 50 + pageWidth / 2 + 10, fromToY);
    if (client) {
      doc.font("Helvetica-Bold").fontSize(10).fillColor(borderColor)
        .text(client.name, 50 + pageWidth / 2 + 10, fromToY + 14, { width: colW });
      doc.font("Helvetica").fontSize(9).fillColor(mutedColor);
      if (client.company) doc.text(client.company, 50 + pageWidth / 2 + 10, doc.y, { width: colW });
      doc.text(client.email, 50 + pageWidth / 2 + 10, doc.y, { width: colW });
      if (client.address) doc.text(client.address, 50 + pageWidth / 2 + 10, doc.y, { width: colW });
    }

    // ── Dates ──
    const datesY = Math.max(doc.y, fromToY + 70) + 16;
    doc
      .moveTo(50, datesY - 4)
      .lineTo(50 + pageWidth, datesY - 4)
      .lineWidth(0.5)
      .strokeColor("#e8e4d9")
      .stroke();

    const issueDate = new Date(invoice.issueDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    const dueDate = new Date(invoice.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

    doc.font("Helvetica-Bold").fontSize(8).fillColor(mutedColor)
      .text("ISSUE DATE", 50, datesY + 4);
    doc.font("Helvetica-Bold").fontSize(10).fillColor(borderColor)
      .text(issueDate, 50, datesY + 16);

    doc.font("Helvetica-Bold").fontSize(8).fillColor(mutedColor)
      .text("DUE DATE", 230, datesY + 4);
    doc.font("Helvetica-Bold").fontSize(10).fillColor(borderColor)
      .text(dueDate, 230, datesY + 16);

    // ── Line items table ──
    const tableY = datesY + 48;
    const colProduct = 50;
    const colQty = 310;
    const colCost = 380;
    const colAmount = 450;

    // Table header bg
    doc.rect(50, tableY, pageWidth, 24).fill(bgLight);

    doc.font("Helvetica-Bold").fontSize(8).fillColor(mutedColor);
    doc.text("PRODUCT / SERVICE", colProduct + 4, tableY + 8);
    doc.text("QTY", colQty, tableY + 8, { width: 60, align: "right" });
    doc.text("UNIT COST", colCost, tableY + 8, { width: 60, align: "right" });
    doc.text("AMOUNT", colAmount, tableY + 8, { width: pageWidth - (colAmount - 50), align: "right" });

    let rowY = tableY + 28;
    for (const item of lineItems) {
      const label = item.name || item.description || "Item";
      const hasDesc = item.name && item.description;
      const rowHeight = hasDesc ? 32 : 22;

      doc.font("Helvetica-Bold").fontSize(10).fillColor(borderColor)
        .text(label, colProduct, rowY, { width: colQty - colProduct - 8 });
      if (hasDesc) {
        doc.font("Helvetica").fontSize(8).fillColor(mutedColor)
          .text(item.description, colProduct, rowY + 13, { width: colQty - colProduct - 8 });
      }

      doc.font("Helvetica").fontSize(10).fillColor(borderColor)
        .text(String(item.quantity), colQty, rowY, { width: 60, align: "right" })
        .text(formatCurrency(Number(item.rate), invoice.currency), colCost, rowY, { width: 60, align: "right" });
      doc.font("Helvetica-Bold")
        .text(formatCurrency(item.quantity * Number(item.rate), invoice.currency), colAmount, rowY, { width: pageWidth - (colAmount - 50), align: "right" });

      rowY += rowHeight;
      doc.moveTo(50, rowY).lineTo(50 + pageWidth, rowY).lineWidth(0.5).strokeColor("#e8e4d9").stroke();
      rowY += 4;
    }

    // ── Totals ──
    const totalsX = 370;
    const totalsWidth = pageWidth - (totalsX - 50);
    let totalsY = rowY + 12;

    doc.font("Helvetica").fontSize(10).fillColor(mutedColor)
      .text("Subtotal", totalsX, totalsY)
      .text(formatCurrency(Number(invoice.subtotal), invoice.currency), totalsX, totalsY, { width: totalsWidth, align: "right" });

    if (Number(invoice.taxRate) > 0) {
      totalsY += 18;
      doc.text(`VAT (${invoice.taxRate}%)`, totalsX, totalsY)
        .text(formatCurrency(Number(invoice.taxAmount), invoice.currency), totalsX, totalsY, { width: totalsWidth, align: "right" });
    }

    totalsY += 12;
    doc.moveTo(totalsX, totalsY).lineTo(50 + pageWidth, totalsY).lineWidth(1.5).strokeColor(borderColor).stroke();
    totalsY += 10;

    doc.font("Helvetica-Bold").fontSize(13).fillColor(borderColor)
      .text("Total", totalsX, totalsY)
      .text(formatCurrency(Number(invoice.total), invoice.currency), totalsX, totalsY, { width: totalsWidth, align: "right" });

    // ── Notes ──
    if (invoice.notes) {
      totalsY += 40;
      doc.moveTo(50, totalsY - 8).lineTo(50 + pageWidth, totalsY - 8).lineWidth(0.5).strokeColor("#e8e4d9").stroke();
      doc.font("Helvetica-Bold").fontSize(8).fillColor(mutedColor).text("NOTES", 50, totalsY);
      doc.font("Helvetica").fontSize(9).fillColor(mutedColor).text(invoice.notes, 50, totalsY + 14, { width: pageWidth });
      totalsY += 14 + doc.heightOfString(invoice.notes, { width: pageWidth });
    }

    // ── Bank details ──
    if (settings?.bankName || settings?.sortCode) {
      totalsY += 24;
      doc.rect(50, totalsY - 8, pageWidth, 8).fill(bgLight);
      doc.rect(50, totalsY, pageWidth, 48).fill(bgLight);
      doc.font("Helvetica-Bold").fontSize(8).fillColor(mutedColor).text("BANK DETAILS", 58, totalsY + 4);
      doc.font("Helvetica").fontSize(9).fillColor(borderColor);
      let bankLine = [settings.bankName, settings.accountName].filter(Boolean).join(" · ");
      doc.text(bankLine, 58, totalsY + 18, { width: pageWidth - 16 });
      let bankLine2Parts = [];
      if (settings.sortCode) bankLine2Parts.push(`Sort Code: ${settings.sortCode}`);
      if (settings.accountNumber) bankLine2Parts.push(`Account: ${settings.accountNumber}`);
      if (bankLine2Parts.length) doc.text(bankLine2Parts.join("  ·  "), 58, totalsY + 30, { width: pageWidth - 16 });
    }

    // ── Footer ──
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(mutedColor)
      .text("Sent via Inflow — Smart Invoice Automation", 50, doc.page.height - 40, {
        width: pageWidth,
        align: "center",
      });

    doc.end();
  });
}
