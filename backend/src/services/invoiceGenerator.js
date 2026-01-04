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

// Brand colors
const COLORS = {
  primary: '#7c3aed',
  dark: '#111827',
  gray: '#6b7280',
  lightGray: '#f3f4f6',
};

/**
 * Generate a PDF invoice
 * @param {Object} options Invoice options
 * @param {string} options.invoiceNumber Unique invoice number
 * @param {Date} options.date Invoice date
 * @param {Object} options.customer Customer details
 * @param {string} options.customer.name Customer name
 * @param {string} options.customer.email Customer email
 * @param {Array} options.items Line items
 * @param {string} options.items[].description Item description
 * @param {number} options.items[].amount Item amount
 * @param {string} options.periodStart Billing period start
 * @param {string} options.periodEnd Billing period end
 * @param {boolean} options.isPaid Whether invoice is paid
 * @returns {Promise<Buffer>} PDF buffer
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
        margin: 50,
        info: {
          Title: `Invoice ${invoiceNumber}`,
          Author: COMPANY.name,
        },
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header with logo/brand
      doc
        .fillColor(COLORS.primary)
        .fontSize(28)
        .font('Helvetica-Bold')
        .text('PromptStack', 50, 50);

      doc
        .fillColor(COLORS.gray)
        .fontSize(10)
        .font('Helvetica')
        .text('AI Prompt Library', 50, 80);

      // Invoice title
      doc
        .fillColor(COLORS.dark)
        .fontSize(24)
        .font('Helvetica-Bold')
        .text('INVOICE', 400, 50, { align: 'right' });

      // Invoice details
      doc
        .fillColor(COLORS.gray)
        .fontSize(10)
        .font('Helvetica')
        .text(`Invoice #: ${invoiceNumber}`, 400, 80, { align: 'right' })
        .text(`Date: ${formatDate(date)}`, 400, 95, { align: 'right' });

      if (isPaid) {
        doc
          .fillColor('#059669')
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('PAID', 400, 115, { align: 'right' });
      }

      // Divider
      doc
        .strokeColor(COLORS.lightGray)
        .lineWidth(1)
        .moveTo(50, 140)
        .lineTo(545, 140)
        .stroke();

      // From section
      doc
        .fillColor(COLORS.gray)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('FROM', 50, 160);

      doc
        .fillColor(COLORS.dark)
        .fontSize(10)
        .font('Helvetica')
        .text(COMPANY.name, 50, 175)
        .text(COMPANY.address, 50, 190)
        .text(COMPANY.email, 50, 205)
        .text(COMPANY.website, 50, 220);

      // To section
      doc
        .fillColor(COLORS.gray)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('BILL TO', 300, 160);

      doc
        .fillColor(COLORS.dark)
        .fontSize(10)
        .font('Helvetica')
        .text(customer.name || 'Valued Customer', 300, 175)
        .text(customer.email, 300, 190);

      // Billing period
      if (periodStart && periodEnd) {
        doc
          .fillColor(COLORS.gray)
          .fontSize(9)
          .text(`Billing Period: ${formatDate(periodStart)} - ${formatDate(periodEnd)}`, 300, 210);
      }

      // Items table header
      const tableTop = 270;
      doc
        .fillColor(COLORS.primary)
        .rect(50, tableTop, 495, 25)
        .fill();

      doc
        .fillColor('#ffffff')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('DESCRIPTION', 60, tableTop + 8)
        .text('AMOUNT', 450, tableTop + 8, { align: 'right' });

      // Items
      let yPosition = tableTop + 35;
      let subtotal = 0;

      items.forEach((item, index) => {
        const bgColor = index % 2 === 0 ? '#ffffff' : COLORS.lightGray;
        doc.fillColor(bgColor).rect(50, yPosition - 5, 495, 25).fill();

        doc
          .fillColor(COLORS.dark)
          .fontSize(10)
          .font('Helvetica')
          .text(item.description, 60, yPosition + 3)
          .text(`${pricingConfig.currencySymbol}${item.amount.toFixed(2)}`, 450, yPosition + 3, {
            align: 'right',
          });

        subtotal += item.amount;
        yPosition += 25;
      });

      // Totals section
      yPosition += 20;

      // Subtotal
      doc
        .fillColor(COLORS.gray)
        .fontSize(10)
        .font('Helvetica')
        .text('Subtotal:', 350, yPosition)
        .fillColor(COLORS.dark)
        .text(`${pricingConfig.currencySymbol}${subtotal.toFixed(2)}`, 450, yPosition, {
          align: 'right',
        });

      yPosition += 20;

      // GST (15% for NZ)
      const gst = subtotal * 0.15;
      doc
        .fillColor(COLORS.gray)
        .text('GST (15%):', 350, yPosition)
        .fillColor(COLORS.dark)
        .text(`${pricingConfig.currencySymbol}${gst.toFixed(2)}`, 450, yPosition, {
          align: 'right',
        });

      yPosition += 25;

      // Total
      const total = subtotal + gst;
      doc
        .fillColor(COLORS.primary)
        .rect(340, yPosition - 5, 205, 30)
        .fill();

      doc
        .fillColor('#ffffff')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('TOTAL:', 355, yPosition + 3)
        .text(
          `${pricingConfig.currency} ${pricingConfig.currencySymbol}${total.toFixed(2)}`,
          450,
          yPosition + 3,
          { align: 'right' }
        );

      // Footer
      const footerY = 750;
      doc
        .fillColor(COLORS.gray)
        .fontSize(9)
        .font('Helvetica')
        .text('Thank you for your subscription to PromptStack!', 50, footerY, {
          align: 'center',
          width: 495,
        })
        .text(
          'Questions? Contact us at hello@promptstack.co.nz',
          50,
          footerY + 15,
          { align: 'center', width: 495 }
        );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate invoice number from timestamp and random suffix
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
 * Format date for display
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
