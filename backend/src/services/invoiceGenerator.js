const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

// Load pricing config for currency
const pricingPath = path.join(__dirname, '../../config/pricing.json');
const pricingConfig = JSON.parse(fs.readFileSync(pricingPath, 'utf8'));

// Company details
const COMPANY = {
  name: 'PromptStack',
  address: 'Auckland, New Zealand',
  email: 'hello@promptstack.co.nz',
  website: 'www.promptstack.co.nz',
};

// Brand colors derived directly from your globals.css
const COLORS = {
  primary: '#004681',    // --alpine-navy
  secondary: '#204E78',  // --mountain-layer-5
  accent: '#F9FBFD',     // --background-start-rgb (snow)
  border: '#E5E7EB',     // Gray-200
  text: '#111827',       // --foreground-rgb
  textMuted: '#6B7280',  // Gray-500
  success: '#059669',    // Green
  white: '#FFFFFF'
};

// Layout constants
const MARGIN = 50;
const PAGE_WIDTH = 595.28; // A4 width in points
const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);

/**
 * Generate a PDF invoice
 */
async function generateInvoice(options) {
  const {
    invoiceNumber,
    date,
    customer,
    items,
    periodStart,
    periodEnd,
    isPaid = true,
  } = options;

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: MARGIN,
        info: {
          Title: `Invoice ${invoiceNumber}`,
          Author: COMPANY.name,
        },
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // --- RENDER SECTIONS ---
      // We use a tracking variable 'y' to ensure elements never overlap
      let y = 50;

      y = renderHeader(doc, y, invoiceNumber, date, isPaid);
      y = renderAddresses(doc, y, customer, periodStart, periodEnd);
      y = renderTable(doc, y, items, pricingConfig);
      renderFooter(doc);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 1. HEADER SECTION
 * Top bar, Logo, Invoice Details, Status Badge
 */
function renderHeader(doc, startY, invoiceNumber, date, isPaid) {
  let y = startY;

  // 1. Top Brand Strip
  doc.rect(0, 0, PAGE_WIDTH, 6).fill(COLORS.primary);

  // 2. Company Name (Logo area)
  doc
    .fillColor(COLORS.primary)
    .fontSize(26)
    .font('Helvetica-Bold')
    .text(COMPANY.name, MARGIN, y);

  doc
    .fillColor(COLORS.textMuted)
    .fontSize(10)
    .font('Helvetica')
    .text('AI Prompt Library', MARGIN, y + 32);

  // 3. Invoice Meta Data (Right aligned)
  // We align these to the right margin
  const rightColX = 400;
  
  doc
    .fillColor(COLORS.textMuted)
    .fontSize(9)
    .font('Helvetica-Bold')
    .text('INVOICE NUMBER', rightColX, y, { align: 'right', width: 145 });

  doc
    .fillColor(COLORS.text)
    .fontSize(10)
    .font('Helvetica')
    .text(invoiceNumber, rightColX, y + 12, { align: 'right', width: 145 });

  doc
    .fillColor(COLORS.textMuted)
    .fontSize(9)
    .font('Helvetica-Bold')
    .text('DATE', rightColX, y + 35, { align: 'right', width: 145 });

  doc
    .fillColor(COLORS.text)
    .fontSize(10)
    .font('Helvetica')
    .text(formatDate(date), rightColX, y + 47, { align: 'right', width: 145 });

  // 4. Status Badge
  const badgeY = y + 70;
  if (isPaid) {
    drawBadge(doc, 'PAID', PAGE_WIDTH - MARGIN, badgeY, COLORS.success);
  } else {
    drawBadge(doc, 'DUE', PAGE_WIDTH - MARGIN, badgeY, COLORS.secondary);
  }

  return y + 110; // Return new Y position
}

/**
 * 2. ADDRESS SECTION
 * From (Left) and Bill To (Right, inside a box)
 */
function renderAddresses(doc, startY, customer, periodStart, periodEnd) {
  const boxPadding = 20;
  const boxHeight = 110;
  
  // "From" Section (Left side)
  doc
    .fillColor(COLORS.textMuted)
    .fontSize(9)
    .font('Helvetica-Bold')
    .text('FROM', MARGIN, startY);

  doc
    .fillColor(COLORS.text)
    .fontSize(10)
    .font('Helvetica')
    .text(COMPANY.name, MARGIN, startY + 15)
    .fillColor(COLORS.textMuted)
    .text(COMPANY.address, MARGIN, startY + 30)
    .text(COMPANY.email, MARGIN, startY + 45)
    .text(COMPANY.website, MARGIN, startY + 60);

  // "Bill To" Section (Right side - highlighted box)
  // We draw a subtle box to frame the customer info professionally
  const boxY = startY - 10;
  const boxX = 300;
  const boxWidth = CONTENT_WIDTH - (boxX - MARGIN);

  doc
    .roundedRect(boxX, boxY, boxWidth, boxHeight, 8)
    .fill(COLORS.accent); // The 'Snow' color from your globals

  // Bill To Content inside the box
  const contentX = boxX + boxPadding;
  const contentY = boxY + boxPadding;

  doc
    .fillColor(COLORS.primary) // Using primary for the header to tie it together
    .fontSize(9)
    .font('Helvetica-Bold')
    .text('BILL TO', contentX, contentY);

  doc
    .fillColor(COLORS.text)
    .fontSize(10)
    .font('Helvetica-Bold')
    .text(customer.name || 'Valued Customer', contentX, contentY + 15)
    .font('Helvetica')
    .fillColor(COLORS.textMuted)
    .text(customer.email, contentX, contentY + 30);

  if (periodStart && periodEnd) {
    doc.text(
      `Period: ${formatDate(periodStart)} - ${formatDate(periodEnd)}`,
      contentX,
      contentY + 50
    );
  }

  // Draw a border around the box for definition
  doc
    .roundedRect(boxX, boxY, boxWidth, boxHeight, 8)
    .strokeColor(COLORS.border)
    .stroke();

  return startY + 140; // Spacing after addresses
}

/**
 * 3. TABLE SECTION
 * Headers, Rows, and Total
 */
function renderTable(doc, startY, items, pricingConfig) {
  let y = startY;

  // --- Table Headers ---
  doc
    .fillColor(COLORS.textMuted)
    .fontSize(9)
    .font('Helvetica-Bold')
    .text('DESCRIPTION', MARGIN, y)
    .text('AMOUNT', MARGIN, y, { align: 'right', width: CONTENT_WIDTH });

  y += 15;

  // Header separator line
  doc
    .moveTo(MARGIN, y)
    .lineTo(PAGE_WIDTH - MARGIN, y)
    .strokeColor(COLORS.primary) // Primary color line for header
    .lineWidth(1)
    .stroke();

  y += 20;

  // --- Table Items ---
  let total = 0;

  items.forEach((item) => {
    // Description
    doc
      .fillColor(COLORS.text)
      .fontSize(10)
      .font('Helvetica')
      .text(item.description, MARGIN, y);

    // Amount
    doc
      .text(
        `${pricingConfig.currencySymbol}${item.amount.toFixed(2)}`,
        MARGIN,
        y,
        { align: 'right', width: CONTENT_WIDTH }
      );

    y += 20;
    
    // Light separator line between items
    doc
      .moveTo(MARGIN, y)
      .lineTo(PAGE_WIDTH - MARGIN, y)
      .strokeColor(COLORS.border)
      .lineWidth(0.5)
      .stroke();
      
    y += 15;
    total += item.amount;
  });

  // --- Totals Section ---
  y += 10;

  // We align the totals block to the right
  // No GST calculation here as requested
  
  const totalLabelX = 350;
  const totalValueX = 450; // Just reference, we use align right with width

  // Final Total Box
  // We make the total standout with a background or larger text
  doc
    .rect(300, y - 10, PAGE_WIDTH - 300 - MARGIN, 40)
    .fill(COLORS.accent); // Light background

  doc
    .fillColor(COLORS.primary)
    .fontSize(11)
    .font('Helvetica-Bold')
    .text('TOTAL', 320, y + 4);

  doc
    .fillColor(COLORS.primary)
    .fontSize(14)
    .text(
      `${pricingConfig.currency} ${pricingConfig.currencySymbol}${total.toFixed(2)}`,
      MARGIN, // Start at margin
      y + 2,
      { align: 'right', width: CONTENT_WIDTH } // Align right against margin
    );

  return y;
}

/**
 * 4. FOOTER SECTION
 * Bottom of page
 */
function renderFooter(doc) {
  const footerY = 750;

  doc
    .moveTo(MARGIN, footerY)
    .lineTo(PAGE_WIDTH - MARGIN, footerY)
    .strokeColor(COLORS.border)
    .lineWidth(1)
    .stroke();

  doc
    .fillColor(COLORS.textMuted)
    .fontSize(9)
    .font('Helvetica')
    .text('Thank you for subscribing to PromptStack.', MARGIN, footerY + 15, {
      align: 'center',
      width: CONTENT_WIDTH
    });

  doc
    .fillColor(COLORS.primary)
    .text(COMPANY.website, MARGIN, footerY + 30, {
      align: 'center',
      width: CONTENT_WIDTH,
      link: `https://${COMPANY.website}`
    });
}

/**
 * Helper to draw a status badge (pill shape) aligned to right
 */
function drawBadge(doc, text, xEnd, y, color) {
  const width = 80;
  const height = 22;
  const xStart = xEnd - width;

  // Pill background
  doc
    .roundedRect(xStart, y, width, height, 11)
    .fill(color);

  // Text
  doc
    .fillColor('#FFFFFF')
    .fontSize(10)
    .font('Helvetica-Bold')
    .text(text, xStart, y + 6, {
      width: width,
      align: 'center',
    });
}

/**
 * Helper to generate Invoice Number
 */
function generateInvoiceNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `INV-${year}${month}-${random}`;
}

/**
 * Helper to format date
 */
function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-NZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

module.exports = {
  generateInvoice,
  generateInvoiceNumber,
  formatDate,
};