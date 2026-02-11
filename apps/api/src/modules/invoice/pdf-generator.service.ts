import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

@Injectable()
export class PdfGeneratorService {
  async generateInvoicePdf(invoice: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Header with company name
      doc.fontSize(24).text('CSFIRM', { align: 'left' });
      doc.fontSize(10).text('Company Secretary Services', { align: 'left' });
      doc.moveDown(0.5);

      // Invoice title
      doc.fontSize(20).text('INVOICE', { align: 'right' });
      doc.moveUp(1);
      doc.fontSize(10);
      doc.text(`Invoice #: ${invoice.invoiceNumber}`, { align: 'right' });
      doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, { align: 'right' });
      if (invoice.dueDate) {
        doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, { align: 'right' });
      }
      doc.moveDown(2);

      // Client details
      doc.fontSize(12).text('Bill To:', { underline: true });
      doc.fontSize(10);
      doc.text(invoice.organization?.name || 'N/A');
      if (invoice.organization?.registeredAddress) {
        const addr = invoice.organization.registeredAddress;
        if (typeof addr === 'object') {
          doc.text(`${addr.street || ''}`);
          doc.text(`${addr.city || ''}, ${addr.state || ''} ${addr.pincode || ''}`);
        }
      }
      doc.text(`Case: ${invoice.case_?.caseNumber || 'N/A'}`);
      doc.moveDown(2);

      // Line items table
      const tableTop = doc.y;
      const itemX = 50;
      const qtyX = 320;
      const priceX = 380;
      const amountX = 480;

      // Table headers
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#444');
      doc.text('Description', itemX, tableTop);
      doc.text('Qty', qtyX, tableTop);
      doc.text('Price', priceX, tableTop);
      doc.text('Amount', amountX, tableTop);
      doc.font('Helvetica');
      doc.moveTo(itemX, tableTop + 15).lineTo(550, tableTop + 15).stroke();

      // Line items
      let y = tableTop + 25;
      const lineItems = invoice.taxBreakup?.lineItems || [];

      lineItems.forEach((item: any) => {
        doc.fontSize(9).fillColor('#000');
        doc.text(item.description || 'Service', itemX, y, { width: 250 });
        doc.text(String(item.quantity || 1), qtyX, y);
        doc.text(`₹${(item.unitPrice || 0).toFixed(2)}`, priceX, y);
        doc.text(`₹${((item.quantity || 1) * (item.unitPrice || 0)).toFixed(2)}`, amountX, y);
        y += 20;
      });

      // Totals
      y += 10;
      doc.moveTo(itemX, y).lineTo(550, y).stroke();
      y += 15;

      const subtotal = invoice.amount || 0;
      const taxRate = invoice.taxBreakup?.taxRate || 0.18;
      const taxAmount = invoice.taxBreakup?.taxAmount || subtotal * taxRate;
      const total = invoice.totalAmount || (subtotal + taxAmount);

      doc.fontSize(10);
      doc.text('Subtotal:', priceX, y);
      doc.text(`₹${subtotal.toFixed(2)}`, amountX, y);
      y += 20;

      doc.text(`Tax (${(taxRate * 100).toFixed(0)}%):`, priceX, y);
      doc.text(`₹${taxAmount.toFixed(2)}`, amountX, y);
      y += 20;

      doc.font('Helvetica-Bold').fontSize(12).fillColor('#000');
      doc.text('Total:', priceX, y);
      doc.text(`₹${total.toFixed(2)}`, amountX, y);
      doc.font('Helvetica');
      y += 30;

      // Payment status
      doc.fontSize(10).fillColor('#444');
      let statusText = 'DRAFT';
      let statusColor = '#999';
      if (invoice.status === 'ISSUED') {
        statusText = 'ISSUED';
        statusColor = '#f59e0b';
      } else if (invoice.status === 'PAID') {
        statusText = 'PAID';
        statusColor = '#10b981';
      } else if (invoice.status === 'CANCELLED') {
        statusText = 'CANCELLED';
        statusColor = '#ef4444';
      }

      doc.fontSize(14).fillColor(statusColor);
      doc.text(`Status: ${statusText}`, itemX, y);

      // Notes
      if (invoice.notes) {
        y += 30;
        doc.fontSize(10).fillColor('#000');
        doc.text('Notes:', itemX, y);
        doc.fontSize(9).fillColor('#444');
        doc.text(invoice.notes, itemX, y + 15, { width: 500 });
      }

      // Footer
      doc.fontSize(8).fillColor('#999');
      doc.text(
        'This is a computer-generated invoice. For queries, contact your case manager.',
        50,
        doc.page.height - 50,
        { align: 'center', width: doc.page.width - 100 }
      );

      doc.end();
    });
  }
}
