// services/emailService.js
import nodemailer from 'nodemailer';

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Send booking confirmation to user
export const sendBookingConfirmationEmail = async (booking, location, pdfBuffer, userEmail) => {
  try {
    const transporter = createTransporter();
    
    const isTokenPayment = booking.paymentType === 'token';
    const paymentStatus = isTokenPayment ? 'Partially Paid (Token)' : 'Fully Paid';
    const nights = Math.ceil((new Date(booking.checkOutDate) - new Date(booking.checkInDate)) / (1000 * 60 * 60 * 24));
    
    const mailOptions = {
      from: `"Rest & Relax" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: `🎉 Booking Confirmed - ${location.name} | Rest & Relax`,
      html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Booking Confirmation - Rest & Relax</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc;">
    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
        
        <!-- Header with Branding -->
        <div style="background: linear-gradient(135deg, #2E8B57 0%, #3CB371 100%); padding: 40px 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 36px; font-weight: 700; letter-spacing: 1px;">Rest & Relax</h1>
            <p style="margin: 8px 0 0 0; font-size: 16px; opacity: 0.9; font-weight: 300;">Luxury Resort & Spa</p>
            <div style="margin-top: 25px; padding: 15px; background: rgba(255,255,255,0.15); border-radius: 8px; display: inline-block;">
                <h2 style="margin: 0; font-size: 24px; font-weight: 600;">Booking Confirmed! 🎉</h2>
            </div>
        </div>

        <!-- Main Content -->
        <div style="padding: 40px 30px;">
            
            <!-- Booking Overview -->
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 25px; margin-bottom: 25px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div>
                        <strong style="color: #166534; display: block; margin-bottom: 5px;">Booking ID</strong>
                        <span style="color: #4b5563; font-family: monospace;">#${booking._id}</span>
                    </div>
                    <div>
                        <strong style="color: #166534; display: block; margin-bottom: 5px;">Resort</strong>
                        <span style="color: #4b5563;">${location.name}</span>
                    </div>
                </div>
            </div>

            <!-- Booking Details Card -->
            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 10px; padding: 30px; margin-bottom: 25px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <h3 style="color: #1f2937; margin-top: 0; margin-bottom: 20px; font-size: 20px; border-bottom: 2px solid #2E8B57; padding-bottom: 10px;">
                    📅 Booking Details
                </h3>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div>
                        <strong style="color: #374151; display: block; margin-bottom: 5px;">Check-in Date</strong>
                        <span style="color: #6b7280;">${new Date(booking.checkInDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                    <div>
                        <strong style="color: #374151; display: block; margin-bottom: 5px;">Check-out Date</strong>
                        <span style="color: #6b7280;">${new Date(booking.checkOutDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 15px;">
                    <div>
                        <strong style="color: #374151; display: block; margin-bottom: 5px;">Duration</strong>
                        <span style="color: #6b7280;">${nights} ${nights > 1 ? 'nights' : 'night'}</span>
                    </div>
                    <div>
                        <strong style="color: #374151; display: block; margin-bottom: 5px;">Guests</strong>
                        <span style="color: #6b7280;">${booking.adults} Adults, ${booking.kids} Kids</span>
                    </div>
                </div>
                
                <div style="margin-top: 15px;">
                    <strong style="color: #374151; display: block; margin-bottom: 5px;">Food Service</strong>
                    <span style="color: ${booking.withFood ? '#059669' : '#6b7280'}; font-weight: 500;">
                        ${booking.withFood ? '✅ Included' : '❌ Not Included'}
                    </span>
                </div>
            </div>

            <!-- Payment Summary Card -->
            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 10px; padding: 30px; margin-bottom: 25px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <h3 style="color: #1f2937; margin-top: 0; margin-bottom: 20px; font-size: 20px; border-bottom: 2px solid #2E8B57; padding-bottom: 10px;">
                    💰 Payment Summary
                </h3>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                    <div><strong style="color: #374151;">Total Amount:</strong></div>
                    <div style="text-align: right; color: #1f2937; font-weight: 600;">₹${booking.pricing.totalPrice.toLocaleString()}</div>
                    
                    <div><strong style="color: #374151;">Amount Paid:</strong></div>
                    <div style="text-align: right; color: #059669; font-weight: 700;">₹${booking.amountPaid.toLocaleString()}</div>
                    
                    <div><strong style="color: #374151;">Remaining Amount:</strong></div>
                    <div style="text-align: right; color: ${booking.remainingAmount > 0 ? '#D97706' : '#059669'}; font-weight: 600;">
                        ₹${booking.remainingAmount.toLocaleString()}
                    </div>
                    
                    <div><strong style="color: #374151;">Payment Type:</strong></div>
                    <div style="text-align: right; color: #6b7280;">${isTokenPayment ? 'Token Payment' : 'Full Payment'}</div>
                </div>

                ${isTokenPayment && booking.remainingAmount > 0 ? `
                <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 20px; margin-top: 15px;">
                    <div style="display: flex; align-items: flex-start; gap: 12px;">
                        <div style="font-size: 20px;">📝</div>
                        <div>
                            <h4 style="margin: 0 0 8px 0; color: #92400e; font-size: 16px;">Important Note for Token Payment</h4>
                            <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                                Please pay the remaining amount of <strong>₹${booking.remainingAmount.toLocaleString()}</strong> 
                                at the property during check-in.
                            </p>
                        </div>
                    </div>
                </div>
                ` : ''}
            </div>

            <!-- Important Information -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 25px; text-align: center;">
                <h4 style="margin: 0 0 15px 0; color: #2E8B57; font-size: 18px;">📍 Important Information</h4>
                <p style="margin: 15px 0 0 0; color: #6b7280; font-size: 14px;">
                    Please carry a valid government ID proof for verification at check-in.
                </p>
            </div>

        </div>

        <!-- Footer -->
        <div style="background: #1f2937; color: white; padding: 30px; text-align: center;">
            <h3 style="margin: 0 0 15px 0; color: #2E8B57; font-size: 24px;">Rest & Relax</h3>
            <p style="margin: 0 0 10px 0; color: #d1d5db; font-size: 14px;">
                Luxury Resort Experience
            </p>
            <p style="margin: 0 0 15px 0; color: #9ca3af; font-size: 14px;">
                📍 ${location.address.line1}, ${location.address.city}<br>
                📞 +91 90990 48961 | ✉️ info@restandrelax.in
            </p>
            <p style="margin: 0; color: #6b7280; font-size: 12px;">
                Thank you for choosing Rest & Relax. We look forward to serving you!<br>
                <em>This is an automated email. Please do not reply to this message.</em>
            </p>
        </div>

    </div>
</body>
</html>
      `,
      attachments: [
        {
          filename: `booking-confirmation-${booking._id}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Confirmation email sent to user:', userEmail);
  } catch (error) {
    console.error('❌ User email failed:', error);
    throw error;
  }
};

// Send notification to admin (Updated with Branding)
export const sendAdminNotification = async (booking, location) => {
  try {
    const transporter = createTransporter();
    
    const isTokenPayment = booking.paymentType === 'token';
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL,
      subject: `📅 New Booking - ${location.name} | Rest & Relax`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #2E8B57 0%, #3CB371 100%); padding: 25px; text-align: center; color: white;">
            <h2 style="margin: 0; font-size: 24px;">Rest & Relax - New Booking</h2>
            <p style="margin: 8px 0 0 0; opacity: 0.9;">New booking received at ${location.name}</p>
          </div>
          
          <div style="padding: 25px;">
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #1f2937; margin-top: 0; border-bottom: 2px solid #2E8B57; padding-bottom: 10px;">Booking Details</h3>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Booking ID:</strong></td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${booking._id}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Guest:</strong></td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${booking.name}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Phone:</strong></td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${booking.phone}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Resort:</strong></td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${location.name}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Check-in:</strong></td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${new Date(booking.checkInDate).toLocaleDateString()}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Check-out:</strong></td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${new Date(booking.checkOutDate).toLocaleDateString()}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Payment Type:</strong></td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${isTokenPayment ? 'Token Payment' : 'Full Payment'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Amount Paid:</strong></td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #059669;">₹${booking.amountPaid.toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0;"><strong>Remaining:</strong></td>
                  <td style="padding: 10px 0; font-weight: bold; color: ${booking.remainingAmount > 0 ? '#D97706' : '#059669'};">₹${booking.remainingAmount.toLocaleString()}</td>
                </tr>
              </table>
            </div>
            
            <p style="color: #6b7280; text-align: center; font-size: 14px;">
              This is an automated notification from Rest & Relax booking system.
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Admin notification sent');
  } catch (error) {
    console.error('❌ Admin email failed:', error);
    // Don't throw error for admin notification failures
  }
};