// services/pdfService.js
import PDFDocument from 'pdfkit';

export const generateBookingPDF = (booking, location) => {
  return new Promise((resolve, reject) => {
    try {
      // Data validation
      const requiredFields = ['_id', 'name', 'phone', 'checkInDate', 'checkOutDate', 'adults', 'kids', 'pricing', 'amountPaid', 'remainingAmount', 'paymentType'];
      requiredFields.forEach(field => {
        if (!booking[field] && booking[field] !== 0) {
          throw new Error(`Missing required field: ${field}`);
        }
      });

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

      // Color Scheme - Improved contrast
      const primaryColor = '#2E8B57'; // Forest Green
      const secondaryColor = '#1E6B4E'; // Darker Green
      const accentColor = '#B8860B'; // Darker Gold for better contrast
      const textDark = '#2D3748';
      const textGray = '#4A5568'; // Darker gray for better readability
      const textLight = '#718096';
      const borderColor = '#E2E8F0';

      let yPosition = 50;

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
      yPosition = 140;

      // Check page break before welcome message
      yPosition = addSectionWithBreak(doc, yPosition, 35);

      // Welcome Message
      doc.fillColor(textDark)
         .fontSize(18)
         .font('Helvetica-Bold')
         .text(`Thank you for your booking, ${booking.name}!`, 50, yPosition);
      
      yPosition += 35;

      // ===== TWO-COLUMN LAYOUT =====
      const columnWidth = (doc.page.width - 100) / 2;
      
      // Check page break before guest info section
      yPosition = addSectionWithBreak(doc, yPosition, 130);

      // Left Column - Guest & Booking Info
      const guestSectionHeight = calculateGuestSectionHeight(booking);
      drawSection(doc, 'GUEST INFORMATION', 50, yPosition, columnWidth - 10);
      
      let guestY = yPosition + 25;
      
      // Name
      doc.fillColor(textGray)
         .fontSize(9)
         .font('Helvetica-Bold')
         .text('Full Name:', 60, guestY);
      doc.fillColor(textDark)
         .fontSize(10)
         .text(truncateText(booking.name, 40), 120, guestY);
      
      guestY += 18;
      
      // Phone
      doc.fillColor(textGray)
         .fontSize(9)
         .font('Helvetica-Bold')
         .text('Contact:', 60, guestY);
      doc.fillColor(textDark)
         .fontSize(10)
         .text(booking.phone, 120, guestY);
      
      guestY += 18;
      
      // Email (if available)
      if (booking.email) {
        doc.fillColor(textGray)
           .fontSize(9)
           .font('Helvetica-Bold')
           .text('Email:', 60, guestY);
        doc.fillColor(textDark)
           .fontSize(9)
           .text(truncateText(booking.email, 35), 120, guestY);
        guestY += 18;
      }
      
      // Address (if available)
      if (booking.address) {
        doc.fillColor(textGray)
           .fontSize(9)
           .font('Helvetica-Bold')
           .text('Address:', 60, guestY);
        const addressLines = wrapText(booking.address, 30); // 30 chars per line
        addressLines.forEach((line, index) => {
          doc.fillColor(textDark)
             .fontSize(8)
             .text(truncateText(line, 35), 120, guestY + (index * 10));
        });
        guestY += (addressLines.length * 10) + 5;
      }

      // Right Column - Resort Info
      drawSection(doc, 'RESORT DETAILS', 50 + columnWidth + 10, yPosition, columnWidth - 10);
      
      let resortY = yPosition + 25;
      
      doc.fillColor(primaryColor)
         .fontSize(11)
         .font('Helvetica-Bold')
         .text(truncateText(location.name, 30), 60 + columnWidth + 10, resortY);
      
      resortY += 15;
      
      const addressLine1 = `${location.address.line1}, ${location.address.city}`;
      doc.fillColor(textDark)
         .fontSize(9)
         .text(truncateText(addressLine1, 35), 60 + columnWidth + 10, resortY);
      
      resortY += 12;
      
      const addressLine2 = `${location.address.state} - ${location.address.pincode}`;
      doc.fillColor(textDark)
         .fontSize(9)
         .text(addressLine2, 60 + columnWidth + 10, resortY);
      
      resortY += 15;
      
      doc.fillColor(textGray)
         .fontSize(9)
         .text('📞 +91 9725860193', 60 + columnWidth + 10, resortY);

      yPosition += Math.max(guestSectionHeight, 120);

      // ===== BOOKING DETAILS =====
      yPosition = addSectionWithBreak(doc, yPosition, 140);
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
      yPosition = addSectionWithBreak(doc, yPosition, 130);
      drawSection(doc, 'PAYMENT SUMMARY', 50, yPosition, doc.page.width - 100);
      
      // Format currency with proper rupee symbol
      const formatCurrency = (amount) => {
        return `₹${typeof amount === 'number' ? amount.toLocaleString('en-IN') : '0'}`;
      };

      const paymentDetails = [
        { label: 'Total Amount', value: formatCurrency(booking.pricing.totalPrice), color: textDark },
        { label: 'Amount Paid', value: formatCurrency(booking.amountPaid), color: primaryColor },
        { label: 'Remaining Amount', value: formatCurrency(booking.remainingAmount), color: booking.remainingAmount > 0 ? '#D97706' : primaryColor },
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
      
      yPosition = addSectionWithBreak(doc, yPosition, 110);
      
      if (isTokenPayment && booking.remainingAmount > 0) {
        drawSection(doc, 'IMPORTANT INFORMATION', 50, yPosition, doc.page.width - 100, '#FEF3C7');
        
        doc.fillColor('#92400E')
           .fontSize(9)
           .font('Helvetica-Bold')
           .text('Payment Reminder:', 60, yPosition + 25);
        
        doc.fillColor('#92400E')
           .fontSize(9)
           .font('Helvetica')
           .text(`• Please pay the remaining amount of ${formatCurrency(booking.remainingAmount)} at the property during check-in.`, 60, yPosition + 40, {
             width: doc.page.width - 120
           });
        
        doc.text('• Please carry a valid government ID proof for verification', 60, yPosition + 60, {
          width: doc.page.width - 120
        });
        
        doc.text('• Early check-in and late check-out subject to availability', 60, yPosition + 75, {
          width: doc.page.width - 120
        });
        
        yPosition += 100;
      } else {
        drawSection(doc, 'BOOKING COMPLETE', 50, yPosition, doc.page.width - 100, '#F0FFF4');
        
        doc.fillColor(primaryColor)
           .fontSize(9)
           .font('Helvetica-Bold')
           .text('Your booking is fully confirmed and paid!', 60, yPosition + 25);
        
        doc.fillColor(textDark)
           .fontSize(9)
           .font('Helvetica')
           .text('• Please carry a valid government ID proof for verification', 60, yPosition + 45, {
             width: doc.page.width - 120
           });
        
        doc.text('• Early check-in and late check-out subject to availability', 60, yPosition + 60, {
          width: doc.page.width - 120
        });
        
        doc.text('• Reception is available 24/7 for your convenience', 60, yPosition + 75, {
          width: doc.page.width - 120
        });
        
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


export const generatePoolPartyBookingPDF = (booking, poolParty) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 50,
        size: 'A4',
        info: {
          Title: `Pool Party Booking - ${booking._id}`,
          Author: 'Rest & Relax',
          Subject: 'Pool Party Booking Confirmation'
        }
      });
      
      const buffers = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Color Scheme
      const primaryColor = '#2E8B57';
      const secondaryColor = '#1E6B4E';
      const accentColor = '#B8860B';
      const textDark = '#2D3748';
      const textGray = '#4A5568';
      const textLight = '#718096';
      const borderColor = '#E2E8F0';

      let yPosition = 50;

      // ===== HEADER SECTION =====
      doc.rect(0, 0, doc.page.width, 120)
         .fill(primaryColor);
      
      doc.fillColor('#FFFFFF')
         .fontSize(28)
         .font('Helvetica-Bold')
         .text('REST & RELAX', 50, 45);
      
      doc.fillColor('rgba(255,255,255,0.8)')
         .fontSize(12)
         .font('Helvetica')
         .text('POOL PARTY BOOKING', 50, 75);
      
      // Badge
      const badgeWidth = 180;
      const badgeX = doc.page.width - badgeWidth - 50;
      doc.roundedRect(badgeX, 40, badgeWidth, 40, 5)
         .fill(accentColor);
      
      doc.fillColor('#000000')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('POOL PARTY BOOKED', badgeX + 10, 52, {
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
      yPosition = 140;

      // Welcome Message
      doc.fillColor(textDark)
         .fontSize(18)
         .font('Helvetica-Bold')
         .text(`Thank you for your pool party booking, ${booking.guestName}!`, 50, yPosition);
      
      yPosition += 35;

      // Two Column Layout
      const columnWidth = (doc.page.width - 100) / 2;

      // Left Column - Guest Info
      drawSectionPool(doc, 'GUEST INFORMATION', 50, yPosition, columnWidth - 10);
      
      let guestY = yPosition + 25;
      
      doc.fillColor(textGray)
         .fontSize(9)
         .font('Helvetica-Bold')
         .text('Full Name:', 60, guestY);
      doc.fillColor(textDark)
         .fontSize(10)
         .text(booking.guestName, 120, guestY);
      
      guestY += 18;
      
      doc.fillColor(textGray)
         .fontSize(9)
         .font('Helvetica-Bold')
         .text('Contact:', 60, guestY);
      doc.fillColor(textDark)
         .fontSize(10)
         .text(booking.phone, 120, guestY);
      
      guestY += 18;
      
      doc.fillColor(textGray)
         .fontSize(9)
         .font('Helvetica-Bold')
         .text('Email:', 60, guestY);
      doc.fillColor(textDark)
         .fontSize(9)
         .text(booking.email, 120, guestY);

      // Right Column - Pool Party Info
      drawSectionPool(doc, 'POOL PARTY DETAILS', 50 + columnWidth + 10, yPosition, columnWidth - 10);
      
      let partyY = yPosition + 25;
      
      doc.fillColor(primaryColor)
         .fontSize(11)
         .font('Helvetica-Bold')
         .text(poolParty.locationName, 60 + columnWidth + 10, partyY);
      
      partyY += 15;
      
      doc.fillColor(textDark)
         .fontSize(9)
         .font('Helvetica-Bold')
         .text('Session:', 60 + columnWidth + 10, partyY);
      doc.fillColor(textDark)
         .fontSize(9)
         .text(booking.session, 130 + columnWidth, partyY);
      
      partyY += 12;
      
      doc.fillColor(textGray)
         .fontSize(9)
         .font('Helvetica-Bold')
         .text('Time:', 60 + columnWidth + 10, partyY);
      
      const sessionTiming = poolParty.timings.find(t => t.session === booking.session);
      if (sessionTiming) {
        doc.fillColor(textDark)
           .fontSize(9)
           .text(`${sessionTiming.startTime} - ${sessionTiming.endTime}`, 130 + columnWidth, partyY);
      }
      
      partyY += 12;
      
      doc.fillColor(textGray)
         .fontSize(9)
         .font('Helvetica-Bold')
         .text('Capacity:', 60 + columnWidth + 10, partyY);
      doc.fillColor(textDark)
         .fontSize(9)
         .text(`${booking.totalGuests} guests`, 130 + columnWidth, partyY);

      yPosition += 120;

      // ===== BOOKING DETAILS =====
      drawSectionPool(doc, 'BOOKING DETAILS', 50, yPosition, doc.page.width - 100);
      
      const bookingDate = new Date(booking.bookingDate);
      
      const details = [
        { label: 'Booking Date', value: bookingDate.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
        { label: 'Session', value: booking.session },
        { label: 'Guests', value: `${booking.adults} Adults, ${booking.kids} Kids` },
        { label: 'Total Guests', value: booking.totalGuests.toString() }
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

      yPosition += 120;

      // ===== PAYMENT SUMMARY =====
      drawSectionPool(doc, 'PAYMENT SUMMARY', 50, yPosition, doc.page.width - 100);

// ✅ SOURCE OF TRUTH = BOOKING
const totalAmount = Number(
  booking.pricing?.totalPrice ||
  booking.pricing?.totalAmount ||
  0
);

const amountPaid = Number(booking.amountPaid || 0);
const remainingAmount = Math.max(0, totalAmount - amountPaid);

// ✅ STATUS TEXT FROM DB
let paymentStatusText = 'Pending';
if (booking.paymentStatus === 'partially_paid') {
  paymentStatusText = 'Partially Paid';
} else if (booking.paymentStatus === 'paid') {
  paymentStatusText = 'Fully Paid';
}

// ✅ PAYMENT TYPE
const paymentTypeText =
  booking.paymentType === 'token'
    ? 'Token Payment'
    : 'Full Payment';

// Format currency
const formatCurrency = (amount) =>
  `₹${Number(amount).toLocaleString('en-IN')}`;

const paymentDetails = [
  { label: 'Total Amount', value: formatCurrency(totalAmount), color: textDark },
  { label: 'Amount Paid', value: formatCurrency(amountPaid), color: primaryColor },
  { label: 'Remaining Amount', value: formatCurrency(remainingAmount), color: remainingAmount > 0 ? '#D97706' : primaryColor },
  { label: 'Payment Type', value: paymentTypeText, color: textDark },
  { label: 'Payment Status', value: paymentStatusText, color: remainingAmount > 0 ? '#D97706' : primaryColor }
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
      drawSectionPool(doc, 'IMPORTANT INFORMATION', 50, yPosition, doc.page.width - 100, '#FEF3C7');
      
      doc.fillColor('#92400E')
         .fontSize(9)
         .font('Helvetica-Bold')
         .text('Please Note:', 60, yPosition + 25);
      
      const notes = [
        '• Please arrive 15 minutes before your session starts',
        '• Children must be accompanied by adults at all times',
        '• Outside food and drinks are not allowed',
        '• Please carry valid ID proof for verification',
        '• No refunds for cancellations within 24 hours of booking'
      ];
      
      notes.forEach((note, index) => {
        doc.fillColor('#92400E')
           .fontSize(9)
           .font('Helvetica')
           .text(note, 60, yPosition + 45 + (index * 12), {
             width: doc.page.width - 120
           });
      });

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
         .text('Luxury Resort & Pool Party', doc.page.width / 2, footerY + 35, { align: 'center' });
      
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

// Helper function to draw sections
const drawSectionPool = (doc, title, x, y, width, bgColor = null) => {
  const sectionHeight = title.includes('INFORMATION') ? 90 : 110;
  
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

// New helper functions for improved layout

// Page break detection
const addSectionWithBreak = (doc, yPosition, sectionHeight) => {
  if (yPosition + sectionHeight > doc.page.height - 150) {
    doc.addPage();
    return 50; // reset Y position for new page
  }
  return yPosition;
};

// Calculate dynamic height for guest section
const calculateGuestSectionHeight = (booking) => {
  let height = 80; // base height
  
  if (booking.email) height += 18;
  if (booking.address) {
    const addressLines = Math.ceil(booking.address.length / 30);
    height += (addressLines * 10) + 5;
  }
  
  return Math.max(height, 120); // minimum height
};

// Text truncation for long content
const truncateText = (text, maxLength = 40) => {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
};

// Text wrapping for addresses
const wrapText = (text, maxLineLength = 30) => {
  if (!text) return [];
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  words.forEach(word => {
    if ((currentLine + word).length <= maxLineLength) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  });

  if (currentLine) lines.push(currentLine);
  return lines;
};