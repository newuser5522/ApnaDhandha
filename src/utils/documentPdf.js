import { calculateTaxTotals, getItemGstRate } from "./invoices.js";

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 12;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const COLORS = {
  ink: [31, 48, 58],
  teal: [29, 78, 74],
  pale: [237, 243, 241],
  line: [203, 213, 210],
  gold: [218, 162, 47],
  muted: [105, 119, 123],
  white: [255, 255, 255],
};

const display = (value) =>
  value == null || value === "" ? "—" : String(value);
const currency = (value) =>
  `INR ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
const dateLabel = (value) => {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? String(value)
    : new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date);
};
const safeFilePart = (value) =>
  String(value || "document")
    .replace(/[<>:"/\\|?*]+/g, "-")
    .trim();

function writeText(pdf, value, x, y, width, options = {}) {
  const lines = pdf.splitTextToSize(display(value), width);
  pdf.text(lines, x, y, { lineHeightFactor: 1.15, ...options });
  return lines.length;
}

function drawPageHeader(pdf, document, kind, continuation = false) {
  const title = kind === "invoice" ? "TAX INVOICE" : "QUOTATION";
  pdf.setTextColor(...COLORS.teal);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(15);
  writeText(pdf, document.businessName || "Your Business", MARGIN, 17, 115);
  pdf.setTextColor(...COLORS.ink);
  pdf.setFontSize(17);
  pdf.text(
    continuation ? `${title} · CONTINUED` : title,
    PAGE_WIDTH - MARGIN,
    17,
    {
      align: "right",
    },
  );
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(...COLORS.ink);
  writeText(pdf, document.businessAddress, MARGIN, 24, 118);
  const contact = [document.businessPhone, document.businessEmail]
    .filter(Boolean)
    .join("  |  ");
  writeText(pdf, contact, MARGIN, 30, 118);
  const taxIds = [
    document.businessGstin && `GSTIN: ${document.businessGstin}`,
    document.businessPan && `PAN: ${document.businessPan}`,
    document.businessState && `State: ${document.businessState}`,
  ]
    .filter(Boolean)
    .join("  |  ");
  writeText(pdf, taxIds, MARGIN, 35, 118);
  pdf.setDrawColor(...COLORS.gold);
  pdf.setLineWidth(1.2);
  pdf.line(MARGIN, 40, PAGE_WIDTH - MARGIN, 40);

  if (continuation) return 46;

  const metaY = 43;
  const metaHeight = 20;
  pdf.setFillColor(...COLORS.pale);
  pdf.rect(MARGIN, metaY, CONTENT_WIDTH, metaHeight, "F");
  const numberLabel = kind === "invoice" ? "Invoice No." : "Quotation No.";
  const expiryLabel = kind === "invoice" ? "Due Date" : "Valid Until";
  const number = kind === "invoice" ? document.invoiceNo : document.quoteNo;
  const expiry = kind === "invoice" ? document.dueDate : document.validTill;
  const metadata = [
    [numberLabel, number],
    ["Document Date", dateLabel(document.date)],
    [expiryLabel, dateLabel(expiry)],
    ["Place of Supply", document.placeOfSupply],
    ["PO Reference", document.purchaseOrderRef],
    ["Reverse Charge", document.reverseCharge || "No"],
  ];
  metadata.forEach(([label, value], index) => {
    const column = index % 3;
    const row = Math.floor(index / 3);
    const x = MARGIN + column * 62;
    const y = metaY + 6 + row * 9;
    pdf.setTextColor(...COLORS.muted);
    pdf.setFontSize(7);
    pdf.text(label, x + 3, y);
    pdf.setTextColor(...COLORS.ink);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    writeText(pdf, value, x + 3, y + 3.5, 55);
    pdf.setFont("helvetica", "normal");
  });

  const partyY = 68;
  const partyHeight = 31;
  const partyWidth = (CONTENT_WIDTH - 4) / 2;
  [MARGIN, MARGIN + partyWidth + 4].forEach((x) => {
    pdf.setDrawColor(...COLORS.line);
    pdf.rect(x, partyY, partyWidth, partyHeight);
  });
  const parties = [
    {
      x: MARGIN + 3,
      label: "Bill To",
      name: document.customer,
      address: document.customerAddress,
      gstin: document.customerGstin,
      state: document.customerState,
      phone: document.customerPhone,
    },
    {
      x: MARGIN + partyWidth + 7,
      label: "Ship To",
      name: document.customer,
      address: document.shippingAddress || document.customerAddress,
      gstin: document.customerGstin,
      state: document.customerState,
      phone: document.customerPhone,
    },
  ];
  parties.forEach((party) => {
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...COLORS.teal);
    pdf.setFontSize(8);
    pdf.text(party.label, party.x, partyY + 5);
    pdf.setTextColor(...COLORS.ink);
    pdf.setFontSize(8);
    writeText(pdf, party.name, party.x, partyY + 10, partyWidth - 8, {
      font: "helvetica",
      fontStyle: "bold",
    });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    let detailY = partyY + 14;
    for (const line of [
      party.address,
      party.gstin && `GSTIN: ${party.gstin}`,
      [party.state, party.phone].filter(Boolean).join("  |  "),
    ].filter(Boolean)) {
      const count = writeText(pdf, line, party.x, detailY, partyWidth - 8);
      detailY += count * 3;
    }
  });

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(...COLORS.ink);
  pdf.text(
    kind === "invoice" ? "Original for Recipient" : "Prepared for customer",
    PAGE_WIDTH - MARGIN,
    104,
    {
      align: "right",
    },
  );
  return 108;
}

const TABLE_COLUMNS = [
  { title: "#", width: 8, align: "center" },
  { title: "Description", width: 46 },
  { title: "HSN / SAC", width: 15, align: "center" },
  { title: "Qty", width: 12, align: "right" },
  { title: "Unit", width: 12, align: "center" },
  { title: "Rate (INR)", width: 19, align: "right" },
  { title: "Taxable (INR)", width: 26, align: "right" },
  { title: "GST %", width: 13, align: "right" },
  { title: "GST Amt (INR)", width: 35, align: "right" },
];

function drawTableHeader(pdf, y) {
  pdf.setFillColor(...COLORS.teal);
  pdf.rect(MARGIN, y, CONTENT_WIDTH, 10, "F");
  pdf.setTextColor(...COLORS.white);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(6.5);
  let x = MARGIN;
  TABLE_COLUMNS.forEach((column) => {
    const textX =
      column.align === "right"
        ? x + column.width - 1
        : column.align === "center"
          ? x + column.width / 2
          : x + 1.5;
    pdf.text(column.title, textX, y + 6.2, {
      align: column.align === "center" ? "center" : column.align || "left",
    });
    x += column.width;
  });
  pdf.setTextColor(...COLORS.ink);
  return y + 10;
}

function drawItemRow(pdf, item, index, y) {
  const quantity = Number(item.qty) || 0;
  const price = Number(item.price) || 0;
  const taxable = quantity * price;
  const rate = getItemGstRate(item);
  const tax = (taxable * rate) / 100;
  const descriptionLines = pdf.splitTextToSize(display(item.name), 43);
  const rowHeight = Math.max(9, descriptionLines.length * 3.2 + 4);
  if (index % 2 === 1) {
    pdf.setFillColor(248, 250, 249);
    pdf.rect(MARGIN, y, CONTENT_WIDTH, rowHeight, "F");
  }
  pdf.setDrawColor(...COLORS.line);
  pdf.rect(MARGIN, y, CONTENT_WIDTH, rowHeight);
  let x = MARGIN;
  const values = [
    String(index + 1),
    display(item.name),
    display(item.hsnSac),
    String(quantity),
    display(item.unit),
    Number(price).toFixed(2),
    Number(taxable).toFixed(2),
    `${rate}%`,
    Number(tax).toFixed(2),
  ];
  TABLE_COLUMNS.forEach((column, columnIndex) => {
    const value = values[columnIndex];
    const align = column.align || "left";
    const textX =
      align === "right"
        ? x + column.width - 1
        : align === "center"
          ? x + column.width / 2
          : x + 1.5;
    const lines = columnIndex === 1 ? descriptionLines : [value];
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.text(lines, textX, y + 5, {
      align: align === "center" ? "center" : align,
      lineHeightFactor: 1.1,
    });
    x += column.width;
  });
  return rowHeight;
}

function drawSummary(pdf, document, totals, y) {
  const taxRows = new Map();
  for (const item of document.items || []) {
    const key = `${display(item.hsnSac)}|${getItemGstRate(item)}`;
    const row = taxRows.get(key) || {
      hsn: display(item.hsnSac),
      rate: getItemGstRate(item),
      taxable: 0,
      tax: 0,
    };
    const taxable = (Number(item.qty) || 0) * (Number(item.price) || 0);
    row.taxable += taxable;
    row.tax += (taxable * row.rate) / 100;
    taxRows.set(key, row);
  }

  const leftWidth = 111;
  const rightX = MARGIN + leftWidth + 5;
  const rightWidth = CONTENT_WIDTH - leftWidth - 5;
  const taxHeaderHeight = 9;
  const taxRowHeight = 8;
  pdf.setFillColor(...COLORS.teal);
  pdf.rect(MARGIN, y, leftWidth, taxHeaderHeight, "F");
  pdf.setTextColor(...COLORS.white);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(6.5);
  pdf.text("HSN / SAC", MARGIN + 2, y + 6);
  pdf.text("Taxable", MARGIN + 26, y + 6);
  pdf.text("CGST", MARGIN + 51, y + 6);
  pdf.text("SGST", MARGIN + 76, y + 6);
  pdf.text("Total Tax", MARGIN + 109, y + 6, { align: "right" });
  let rowY = y + taxHeaderHeight;
  pdf.setTextColor(...COLORS.ink);
  pdf.setFont("helvetica", "normal");
  for (const row of taxRows.values()) {
    pdf.setDrawColor(...COLORS.line);
    pdf.rect(MARGIN, rowY, leftWidth, taxRowHeight);
    pdf.setFontSize(7);
    pdf.text(row.hsn, MARGIN + 2, rowY + 5.2);
    pdf.text(row.taxable.toFixed(2), MARGIN + 48, rowY + 5.2, {
      align: "right",
    });
    pdf.text((row.tax / 2).toFixed(2), MARGIN + 72, rowY + 5.2, {
      align: "right",
    });
    pdf.text((row.tax / 2).toFixed(2), MARGIN + 97, rowY + 5.2, {
      align: "right",
    });
    pdf.text(row.tax.toFixed(2), MARGIN + 109, rowY + 5.2, { align: "right" });
    rowY += taxRowHeight;
  }
  if (!taxRows.size) rowY += taxRowHeight;
  pdf.setFillColor(...COLORS.pale);
  pdf.rect(MARGIN, rowY, leftWidth, taxRowHeight, "F");
  pdf.setFont("helvetica", "bold");
  pdf.text("Total", MARGIN + 2, rowY + 5.2);
  pdf.text(totals.subtotal.toFixed(2), MARGIN + 48, rowY + 5.2, {
    align: "right",
  });
  pdf.text((totals.gstAmount / 2).toFixed(2), MARGIN + 72, rowY + 5.2, {
    align: "right",
  });
  pdf.text((totals.gstAmount / 2).toFixed(2), MARGIN + 97, rowY + 5.2, {
    align: "right",
  });
  pdf.text(totals.gstAmount.toFixed(2), MARGIN + 109, rowY + 5.2, {
    align: "right",
  });
  rowY += taxRowHeight;

  const totalRows = [
    ["Taxable value", currency(totals.subtotal)],
    ["GST", currency(totals.gstAmount)],
    ["Round off", currency(totals.total - totals.subtotal - totals.gstAmount)],
  ];
  let totalY = y;
  totalRows.forEach(([label, value]) => {
    pdf.setDrawColor(...COLORS.line);
    pdf.rect(rightX, totalY, rightWidth, taxRowHeight);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text(label, rightX + 2, totalY + 5.2);
    pdf.text(value, rightX + rightWidth - 2, totalY + 5.2, { align: "right" });
    totalY += taxRowHeight;
  });
  pdf.setFillColor(...COLORS.teal);
  pdf.rect(rightX, totalY, rightWidth, 10, "F");
  pdf.setTextColor(...COLORS.white);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text("Grand Total", rightX + 2, totalY + 6.5);
  pdf.text(currency(totals.total), rightX + rightWidth - 2, totalY + 6.5, {
    align: "right",
  });
  pdf.setTextColor(...COLORS.ink);
  return Math.max(rowY, totalY + 10);
}

function drawFooter(pdf, document, y) {
  if (y > 248) {
    pdf.addPage();
    y = 25;
  }
  const gap = 6;
  const width = (CONTENT_WIDTH - gap) / 2;
  const banks = [
    document.bankAccountName && `Account name: ${document.bankAccountName}`,
    document.bankName && `Bank: ${document.bankName}`,
    document.bankAccountNumber &&
      `Account number: ${document.bankAccountNumber}`,
    document.bankIfsc && `IFSC: ${document.bankIfsc}`,
    document.upiId && `UPI: ${document.upiId}`,
  ].filter(Boolean);
  const terms = [document.notes, document.termsConditions]
    .filter(Boolean)
    .join("\n")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const bankHeight = Math.max(22, 8 + banks.length * 4);
  const termsHeight = Math.max(22, 8 + terms.length * 4);
  const boxHeight = Math.max(bankHeight, termsHeight);

  pdf.setDrawColor(...COLORS.line);
  pdf.rect(MARGIN, y, width, boxHeight);
  pdf.rect(MARGIN + width + gap, y, width, boxHeight);
  pdf.setTextColor(...COLORS.teal);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text("Bank Details", MARGIN + 3, y + 5);
  pdf.text("Terms & Conditions", MARGIN + width + gap + 3, y + 5);
  pdf.setTextColor(...COLORS.ink);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  banks.forEach((line, index) =>
    writeText(pdf, line, MARGIN + 3, y + 10 + index * 4, width - 6),
  );
  terms.forEach((line, index) =>
    writeText(
      pdf,
      line,
      MARGIN + width + gap + 3,
      y + 10 + index * 4,
      width - 6,
    ),
  );
  pdf.setFontSize(7);
  pdf.setTextColor(...COLORS.muted);
  pdf.text("Generated by Apna Dhandha", PAGE_WIDTH / 2, y + boxHeight + 7, {
    align: "center",
  });
}

export async function downloadDocumentPdf(document, kind) {
  const { default: jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const totals = calculateTaxTotals(document.items || []);
  let y = drawPageHeader(pdf, document, kind);
  y = drawTableHeader(pdf, y);

  for (const [index, item] of (document.items || []).entries()) {
    const rowHeight = Math.max(
      9,
      pdf.splitTextToSize(display(item.name), 43).length * 3.2 + 4,
    );
    if (y + rowHeight > 238) {
      pdf.addPage();
      y = drawPageHeader(pdf, document, kind, true);
      y = drawTableHeader(pdf, y);
    }
    y += drawItemRow(pdf, item, index, y);
  }

  if (y > 202) {
    pdf.addPage();
    y = drawPageHeader(pdf, document, kind, true);
  }
  y += 5;
  y = drawSummary(pdf, document, totals, y);
  y += 8;
  drawFooter(pdf, document, y);
  const documentNo = kind === "invoice" ? document.invoiceNo : document.quoteNo;
  pdf.save(
    `${kind === "invoice" ? "Invoice" : "Quotation"}-${safeFilePart(documentNo)}.pdf`,
  );
}
