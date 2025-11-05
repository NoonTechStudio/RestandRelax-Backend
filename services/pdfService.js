// services/pdfService.js
import PDFDocument from 'pdfkit';

export const generateBookingPDF = (booking, location) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 50,
        size: 'A4',
        info: {
          Title: `Booking Confirmation - ${booking._id}`,
          Author: 'Rest & Relax',
          Subject: 'Booking Confirmation'
        }
      });
      
      const buffers = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Color Scheme
      const primaryColor = '#2E8B57'; // Forest Green
      const secondaryColor = '#1E6B4E'; // Darker Green
      const accentColor = '#D4AF37'; // Gold
      const textDark = '#2D3748';
      const textGray = '#4A5568';
      const textLight = '#718096';
      const borderColor = '#E2E8F0';

      // ===== HEADER SECTION =====
      // Background Header
      doc.rect(0, 0, doc.page.width, 120)
         .fill(primaryColor);
      
      // Logo/Brand Name
      doc.fillColor('#FFFFFF')
         .fontSize(28)
         .font('Helvetica-Bold')
         .text('REST & RELAX', 50, 45);
      
      doc.fillColor('rgba(255,255,255,0.8)')
         .fontSize(12)
         .font('Helvetica')
         .text('LUXURY RESORT & SPA', 50, 75);
      
      // Confirmation Badge
      const badgeWidth = 180;
      const badgeX = doc.page.width - badgeWidth - 50;
      doc.roundedRect(badgeX, 40, badgeWidth, 40, 5)
         .fill(accentColor);
      
      doc.fillColor('#000000')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('BOOKING CONFIRMED', badgeX + 10, 52, {
           width: badgeWidth - 20,
           align: 'center'
         });
      
      doc.fillColor('#000000')
         .fontSize(8)
         .font('Helvetica')
         .text(`ID: ${booking._id}`, badgeX + 10, 68, {
           width: badgeWidth - 20,
           align: 'center'
         });

      // ===== MAIN CONTENT =====
      let yPosition = 140;

      // Welcome Message
      doc.fillColor(textDark)
         .fontSize(18)
         .font('Helvetica-Bold')
         .text(`Thank you for your booking, ${booking.name}!`, 50, yPosition);
      
      yPosition += 35;

      // ===== TWO-COLUMN LAYOUT =====
      const columnWidth = (doc.page.width - 100) / 2;
      
      // Left Column - Guest & Booking Info
      drawSection(doc, 'GUEST INFORMATION', 50, yPosition, columnWidth - 10);
      
      doc.fillColor(textGray)
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('Full Name:', 60, yPosition + 30);
      doc.fillColor(textDark)
         .text(booking.name, 60, yPosition + 30, { continued: false });
      
      doc.fillColor(textGray)
         .text('Contact:', 60, yPosition + 45);
      doc.fillColor(textDark)
         .text(`${booking.phone}${booking.email ? `\n${booking.email}` : ''}`, 60, yPosition + 45, { continued: false });
      
      if (booking.address) {
        doc.fillColor(textGray)
           .text('Address:', 60, yPosition + 70);
        doc.fillColor(textDark)
           .fontSize(9)
           .text(booking.address, 60, yPosition + 70, { 
             width: columnWidth - 20,
             continued: false 
           });
      }

      // Right Column - Resort Info
      drawSection(doc, 'RESORT DETAILS', 50 + columnWidth + 10, yPosition, columnWidth - 10);
      
      doc.fillColor(primaryColor)
         .fontSize(11)
         .font('Helvetica-Bold')
         .text(location.name, 60 + columnWidth + 10, yPosition + 30);
      
      doc.fillColor(textDark)
         .fontSize(9)
         .text(`${location.address.line1}, ${location.address.city}`, 60 + columnWidth + 10, yPosition + 45);
      doc.text(`${location.address.state} - ${location.address.pincode}`, 60 + columnWidth + 10, yPosition + 58);
      
      doc.fillColor(textGray)
         .fontSize(9)
         .text('📞 +91 9725860193', 60 + columnWidth + 10, yPosition + 75);

      yPosition += 130;

      // ===== BOOKING DETAILS =====
      drawSection(doc, 'BOOKING DETAILS', 50, yPosition, doc.page.width - 100);
      
      const checkInDate = new Date(booking.checkInDate);
      const checkOutDate = new Date(booking.checkOutDate);
      const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
      
      const details = [
        { label: 'Check-in Date', value: checkInDate.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
        { label: 'Check-out Date', value: checkOutDate.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
        { label: 'Duration', value: `${nights} ${nights > 1 ? 'nights' : 'night'}` },
        { label: 'Guests', value: `${booking.adults} Adults, ${booking.kids} Kids` },
        { label: 'Food Service', value: booking.withFood ? '✅ Included' : '❌ Not Included' }
      ];
      
      details.forEach((detail, index) => {
        const detailY = yPosition + 30 + (index * 18);
        doc.fillColor(textGray)
           .fontSize(10)
           .font('Helvetica')
           .text(detail.label + ':', 60, detailY);
        doc.fillColor(textDark)
           .fontSize(10)
           .font('Helvetica-Bold')
           .text(detail.value, 200, detailY);
      });

      yPosition += 140;

      // ===== PAYMENT SUMMARY =====
      drawSection(doc, 'PAYMENT SUMMARY', 50, yPosition, doc.page.width - 100);
      
      const paymentDetails = [
        { label: 'Total Amount', value: `₹${booking.pricing.totalPrice.toLocaleString()}`, color: textDark },
        { label: 'Amount Paid', value: `₹${booking.amountPaid.toLocaleString()}`, color: primaryColor },
        { label: 'Remaining Amount', value: `₹${booking.remainingAmount.toLocaleString()}`, color: booking.remainingAmount > 0 ? '#D97706' : primaryColor },
        { label: 'Payment Type', value: booking.paymentType === 'token' ? 'Token Payment' : 'Full Payment', color: textDark },
        { label: 'Payment Status', value: booking.remainingAmount === 0 ? 'Fully Paid' : 'Partially Paid', color: booking.remainingAmount === 0 ? primaryColor : '#D97706' }
      ];
      
      paymentDetails.forEach((detail, index) => {
        const paymentY = yPosition + 30 + (index * 18);
        doc.fillColor(textGray)
           .fontSize(10)
           .font('Helvetica')
           .text(detail.label + ':', 60, paymentY);
        doc.fillColor(detail.color)
           .fontSize(10)
           .font('Helvetica-Bold')
           .text(detail.value, 200, paymentY);
      });

      yPosition += 130;

      // ===== IMPORTANT NOTES =====
      const isTokenPayment = booking.paymentType === 'token';
      
      if (isTokenPayment && booking.remainingAmount > 0) {
        drawSection(doc, 'IMPORTANT INFORMATION', 50, yPosition, doc.page.width - 100, '#FEF3C7');
        
        doc.fillColor('#92400E')
           .fontSize(9)
           .font('Helvetica-Bold')
           .text('Payment Reminder:', 60, yPosition + 25);
        
        doc.fillColor('#92400E')
           .fontSize(9)
           .font('Helvetica')
           .text(`• Please pay the remaining amount of ₹${booking.remainingAmount.toLocaleString()} at the property during check-in.`, 60, yPosition + 40, {
             width: doc.page.width - 120
           });
        
        doc.text('• Please carry a valid government ID proof for verification', 60, yPosition + 73);
        
        yPosition += 110;
      } else {
        drawSection(doc, 'BOOKING COMPLETE', 50, yPosition, doc.page.width - 100, '#F0FFF4');
        
        doc.fillColor(primaryColor)
           .fontSize(9)
           .font('Helvetica-Bold')
           .text('Your booking is fully confirmed and paid!', 60, yPosition + 25);
        
        doc.fillColor(textDark)
           .fontSize(9)
           .font('Helvetica')
         doc.text('• Please carry a valid government ID proof for verification', 60, yPosition + 57);
        doc.text('• Early check-in and late check-out subject to availability', 60, yPosition + 72);
        
        yPosition += 100;
      }

      // ===== FOOTER =====
      const footerY = doc.page.height - 80;
      
      doc.rect(0, footerY, doc.page.width, 80)
         .fill('#F7FAFC');
      
      doc.moveTo(50, footerY)
         .lineTo(doc.page.width - 50, footerY)
         .strokeColor(borderColor)
         .lineWidth(1)
         .stroke();
      
      doc.fillColor(primaryColor)
         .fontSize(16)
         .font('Helvetica-Bold')
         .text('Rest & Relax', doc.page.width / 2, footerY + 15, { align: 'center' });
      
      doc.fillColor(textGray)
         .fontSize(9)
         .font('Helvetica')
         .text('Luxury Resort Experience', doc.page.width / 2, footerY + 35, { align: 'center' });
      
      doc.fillColor(textLight)
         .fontSize(8)
         .text('📞 +91 90990 48961 | ✉️ info@restandrelax.in', doc.page.width / 2, footerY + 50, { align: 'center' });
      
      doc.fillColor(textLight)
         .fontSize(7)
         .text('Thank you for choosing Rest & Relax. We look forward to serving you!', doc.page.width / 2, footerY + 62, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

// Helper function to draw consistent sections
const drawSection = (doc, title, x, y, width, bgColor = null) => {
  const sectionHeight = title.includes('IMPORTANT') || title.includes('COMPLETE') ? 90 : 
                       title.includes('PAYMENT') ? 120 : 110;
  
  if (bgColor) {
    doc.roundedRect(x, y, width, sectionHeight, 5)
       .fill(bgColor);
  }
  
  // Section title with accent
  doc.fillColor('#2E8B57')
     .rect(x, y, 4, 20)
     .fill();
  
  doc.fillColor('#2D3748')
     .fontSize(12)
     .font('Helvetica-Bold')
     .text(title, x + 10, y + 5);
  
  // Border
  doc.roundedRect(x, y, width, sectionHeight, 5)
     .strokeColor('#E2E8F0')
     .lineWidth(1)
     .stroke();
};