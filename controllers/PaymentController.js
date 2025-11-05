import crypto from 'crypto';
import Payment from '../models/Payment.js';
import Booking from '../models/Booking.js';
import { razorpayInstance } from '../config/razorpay.js';
import { paymentLimiter } from '../middleware/security.js';
// In your paymentController.js - UPDATE verifyPayment function
import { generateBookingPDF } from '../services/pdfService.js';
import { sendBookingConfirmationEmail, sendAdminNotification } from '../services/emailService.js';


// Create Razorpay order
export const createOrder = async (req, res) => {
  try {
    const { 
      bookingId, 
      amount, 
      currency = 'INR',
      userEmail,
      userPhone 
    } = req.body;

    // Validate booking exists and is not already paid
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        error: 'Booking is already paid'
      });
    }

    // Create Razorpay order
    // In your createOrder function - UPDATE this line:
const options = {
  amount: Math.round(amount * 100),
  currency,
  receipt: `book_${bookingId.toString().slice(-12)}_${Date.now().toString().slice(-8)}`,
  // This creates something like: "book_abc123_89012345" (well under 40 chars)
  notes: {
    bookingId: bookingId.toString(),
    guestName: booking.name,
    guestPhone: booking.phone
  },
  payment_capture: 1
};

    const order = await razorpayInstance.orders.create(options);

    // Create payment record
    const payment = new Payment({
      bookingId,
      razorpayOrderId: order.id,
      amount: amount,
      currency,
      userEmail,
      userPhone,
      status: 'created'
    });

    await payment.save();

    // Update booking with Razorpay order ID
    booking.razorpayOrderId = order.id;
    await booking.save();

    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt
      },
      payment: {
        id: payment._id,
        status: payment.status
      },
      key: process.env.RAZORPAY_KEY_ID
    });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create payment order'
    });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      bookingId
    } = req.body;

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !bookingId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required payment details'
      });
    }

    // Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      // Update payment status to failed
      await Payment.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        { status: 'failed' }
      );

      return res.status(400).json({
        success: false,
        error: 'Payment verification failed - invalid signature'
      });
    }

    // Find and update payment record
    const payment = await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        status: 'paid'
      },
      { new: true }
    ).populate('bookingId');

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment record not found'
      });
    }

    // Update booking payment status
    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      {
        paymentStatus: 'paid',
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature
      },
      { new: true }
    ).populate('location');

    // ✅ GENERATE PDF
    const pdfBuffer = await generateBookingPDF(booking, booking.location);
    
    // ✅ SEND EMAIL TO USER
    if (payment.userEmail) {
      try {
        await sendBookingConfirmationEmail(booking, booking.location, pdfBuffer, payment.userEmail);
      } catch (emailError) {
        console.error('User email failed but booking successful:', emailError);
        // Continue even if email fails
      }
    }
    
    // ✅ SEND NOTIFICATION TO ADMIN
    try {
      await sendAdminNotification(booking, booking.location);
    } catch (adminEmailError) {
      console.error('Admin email failed:', adminEmailError);
      // Continue even if admin email fails
    }

    res.json({
      success: true,
      message: 'Payment verified successfully',
      payment: {
        id: payment._id,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        razorpayPaymentId: payment.razorpayPaymentId
      },
      booking: {
        id: booking._id,
        paymentStatus: booking.paymentStatus,
        location: booking.location.name,
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
        totalPrice: booking.pricing.totalPrice
      },
      pdfDownloadUrl: `/api/bookings/${booking._id}/download-pdf`
    });

  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Payment verification failed'
    });
  }
};

// Get payment status
export const getPaymentStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const payment = await Payment.findOne({ bookingId })
      .populate({
        path: 'bookingId',
        populate: {
          path: 'location',
          select: 'name address'
        }
      })
      .sort({ createdAt: -1 });

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment record not found'
      });
    }

    const booking = await Booking.findById(bookingId);

    res.json({
      success: true,
      payment: {
        id: payment._id,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        razorpayOrderId: payment.razorpayOrderId,
        razorpayPaymentId: payment.razorpayPaymentId,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt
      },
      booking: {
        paymentStatus: booking.paymentStatus,
        totalPrice: booking.pricing.totalPrice,
        name: booking.name,
        phone: booking.phone
      }
    });

  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payment status'
    });
  }
};


// Get all payments with filtering and pagination
export const getAllPayments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      startDate,
      endDate,
      search
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (status && status !== 'all') filter.status = status;
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Build the main query
    let query = Payment.find(filter);

    // Handle search across booking fields
    if (search) {
      const bookingMatch = await Booking.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { 'locationSnapshot.name': { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      
      const bookingIds = bookingMatch.map(b => b._id);
      query = query.where('bookingId').in(bookingIds);
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get payments with population
    const payments = await query
      .populate({
        path: 'bookingId',
        select: 'name phone address checkInDate checkOutDate adults kids withFood locationSnapshot',
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Get total count for pagination
    const total = await Payment.countDocuments(filter);

    // Calculate payment statistics
    const stats = await Payment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          successfulPayments: {
            $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] }
          },
          failedPayments: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          },
          pendingPayments: {
            $sum: { $cond: [{ $eq: ['$status', 'created'] }, 1, 0] }
          },
          totalTransactions: { $sum: 1 }
        }
      }
    ]);

    const statistics = stats[0] ? {
      totalAmount: stats[0].totalAmount,
      successfulPayments: stats[0].successfulPayments,
      failedPayments: stats[0].failedPayments,
      pendingPayments: stats[0].pendingPayments,
      totalTransactions: stats[0].totalTransactions
    } : {
      totalAmount: 0,
      successfulPayments: 0,
      failedPayments: 0,
      pendingPayments: 0,
      totalTransactions: 0
    };

    res.json({
      success: true,
      payments,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalPayments: total,
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1
      },
      statistics
    });

  } catch (error) {
    console.error('Get all payments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payments'
    });
  }
};

// Process refund
export const refundPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, notes } = req.body;

    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    if (payment.status !== 'paid') {
      return res.status(400).json({
        success: false,
        error: 'Only paid payments can be refunded'
      });
    }

    // Create Razorpay refund
    const refundOptions = {
      payment_id: payment.razorpayPaymentId,
      amount: Math.round(amount * 100), // Convert to paise
      notes: {
        reason: notes || 'Customer request',
        bookingId: payment.bookingId.toString()
      }
    };

    const refund = await razorpayInstance.payments.refund(refundOptions);

    // Update payment record
    payment.status = amount === payment.amount ? 'refunded' : 'partially_refunded';
    payment.refundAmount = amount;
    payment.refundNotes = notes;
    payment.refundedAt = new Date();
    payment.razorpayRefundId = refund.id;
    await payment.save();

    res.json({
      success: true,
      message: 'Refund processed successfully',
      refund: {
        id: refund.id,
        amount: refund.amount / 100, // Convert back to rupees
        status: refund.status
      },
      payment: {
        id: payment._id,
        status: payment.status,
        refundAmount: payment.refundAmount
      }
    });

  } catch (error) {
    console.error('Refund payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process refund: ' + error.message
    });
  }
};

// Admin direct payment processing
export const processAdminPayment = async (req, res) => {
  try {
    const { bookingId, amount, paymentMethod, notes } = req.body;

    // Validate booking exists
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    // Check if booking is already paid
    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        error: 'Booking is already paid'
      });
    }

    // Create payment record for admin payment
    const payment = new Payment({
      bookingId,
      amount: amount || booking.pricing.totalPrice,
      currency: 'INR',
      status: 'paid',
      userEmail: '', // Can be empty for admin payments
      userPhone: booking.phone,
      adminNotes: notes || `Admin processed payment via ${paymentMethod}`,
      updatedBy: req.admin._id, // From auth middleware
      razorpayOrderId: `admin_${Date.now()}`,
      razorpayPaymentId: `admin_pay_${Date.now()}`
    });

    await payment.save();

    // Update booking payment status
    booking.paymentStatus = 'paid';
    booking.razorpayPaymentId = payment.razorpayPaymentId;
    await booking.save();

    // Generate PDF and send emails (optional for admin payments)
    try {
      const populatedBooking = await Booking.findById(bookingId).populate('location');
      const pdfBuffer = await generateBookingPDF(populatedBooking, populatedBooking.location);
      
      // Send confirmation if user email exists
      if (payment.userEmail) {
        await sendBookingConfirmationEmail(populatedBooking, populatedBooking.location, pdfBuffer, payment.userEmail);
      }
      
      await sendAdminNotification(populatedBooking, populatedBooking.location);
    } catch (emailError) {
      console.error('Email sending failed but payment recorded:', emailError);
      // Continue even if emails fail
    }

    res.json({
      success: true,
      message: 'Payment processed successfully',
      payment: {
        id: payment._id,
        status: payment.status,
        amount: payment.amount,
        adminNotes: payment.adminNotes
      },
      booking: {
        id: booking._id,
        paymentStatus: booking.paymentStatus
      }
    });

  } catch (error) {
    console.error('Admin payment processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process admin payment'
    });
  }
};

// Mark payment as paid (simple status update)
export const markAsPaid = async (req, res) => {
  try {
    const { bookingId, notes } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    // Update booking
    booking.paymentStatus = 'paid';
    booking.razorpayPaymentId = `manual_${Date.now()}`;
    await booking.save();

    // Create or update payment record
    const payment = await Payment.findOneAndUpdate(
      { bookingId },
      {
        status: 'paid',
        adminNotes: notes || 'Marked as paid by admin',
        updatedBy: req.admin._id,
        razorpayPaymentId: booking.razorpayPaymentId
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: 'Booking marked as paid successfully',
      booking: {
        id: booking._id,
        paymentStatus: booking.paymentStatus
      },
      payment: {
        id: payment._id,
        status: payment.status
      }
    });

  } catch (error) {
    console.error('Mark as paid error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark booking as paid'
    });
  }
};


