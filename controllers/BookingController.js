import Booking from "../models/Booking.js";

export const createBooking = async (req, res) => {
  try {
    const { 
      locationId, 
      checkInDate, 
      checkOutDate,
      name,
      phone,
      address,
      adults = 1,
      kids = 0,
      withFood = false,
      paymentType = "full",
      amountPaid = 0,
      remainingAmount = 0,
      pricing = {}
    } = req.body;

    // Check for existing PAID bookings only
    const existingBooking = await Booking.findOne({
      location: locationId,
      paymentStatus: "paid",  // Only check against paid bookings
      $or: [
        {
          checkInDate: { $lte: new Date(checkOutDate) },
          checkOutDate: { $gte: new Date(checkInDate) }
        }
      ]
    });

    if (existingBooking) {
      return res.status(400).json({ 
        success: false,
        error: "These dates are already booked! Please select different dates." 
      });
    }

    // Create new booking with payment details
    const booking = new Booking({
      location: locationId,
      checkInDate: new Date(checkInDate),
      checkOutDate: new Date(checkOutDate),
      name,
      phone,
      address,
      adults: parseInt(adults) || 1,
      kids: parseInt(kids) || 0,
      withFood: Boolean(withFood),
      paymentType: paymentType || "full",
      amountPaid: parseFloat(amountPaid) || 0,
      remainingAmount: parseFloat(remainingAmount) || 0,
      paymentStatus: "pending",  // Explicitly set as pending
      pricing: {
        pricePerAdult: pricing.pricePerAdult || 0,
        pricePerKid: pricing.pricePerKid || 0,
        extraPersonCharge: pricing.extraPersonCharge || 0,
        totalPrice: pricing.totalPrice || 0
      }
    });

    await booking.save();
    await booking.populate('location');
    
    res.status(201).json({
      success: true,
      message: "Booking created successfully",
      booking
    });
    
  } catch (err) {
    console.error("Booking creation error:", err);
    res.status(400).json({ 
      success: false,
      error: err.message 
    });
  }
};

export const getBookedDates = async (req, res) => {
  try {
    const { locationId } = req.params;
    
    if (!locationId) {
      return res.status(400).json({
        success: false,
        error: "Location ID is required"
      });
    }

    // ONLY include paid bookings
    const bookings = await Booking.find({
      location: locationId,
      paymentStatus: "paid"  // Only paid bookings block dates
    }).select('checkInDate checkOutDate paymentStatus');

    console.log(`Found ${bookings.length} PAID bookings for location ${locationId}`);

    const bookedDates = [];
    
    bookings.forEach(booking => {
      const start = new Date(booking.checkInDate);
      const end = new Date(booking.checkOutDate);
      
      // Normalize dates
      const normalizedStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const normalizedEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      
      const currentDate = new Date(normalizedStart);
      
      // Include all dates from check-in to check-out (inclusive)
      while (currentDate <= normalizedEnd) {
        bookedDates.push({
          date: new Date(currentDate),
          status: booking.paymentStatus
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });

    res.json({
      success: true,
      bookedDates,
      count: bookedDates.length,
      totalBookings: bookings.length
    });
    
  } catch (err) {
    console.error("Get booked dates error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

export const getBookings = async (req, res) => {
  try {
    const bookings = await Booking.find().populate("location").sort({ createdAt: -1 });
    
    // Add payment summary for each booking
    const bookingsWithPaymentSummary = bookings.map(booking => ({
      ...booking.toObject(),
      paymentSummary: {
        type: booking.paymentType,
        paid: booking.amountPaid,
        remaining: booking.remainingAmount,
        total: booking.pricing.totalPrice,
        status: booking.paymentStatus
      }
    }));

    res.json({
      success: true,
      count: bookings.length,
      bookings: bookingsWithPaymentSummary
    });
  } catch (err) {
    console.error("Get bookings error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

export const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate("location");
    if (!booking) {
      return res.status(404).json({ 
        success: false,
        error: "Booking not found" 
      });
    }

    // Add detailed payment information
    const bookingWithPaymentDetails = {
      ...booking.toObject(),
      paymentDetails: {
        type: booking.paymentType,
        amountPaid: booking.amountPaid,
        remainingAmount: booking.remainingAmount,
        totalAmount: booking.pricing.totalPrice,
        paymentStatus: booking.paymentStatus,
        isTokenPayment: booking.paymentType === 'token',
        isFullyPaid: booking.remainingAmount === 0
      }
    };

    res.json({
      success: true,
      booking: bookingWithPaymentDetails
    });
  } catch (err) {
    console.error("Get booking by ID error:", err);
    res.status(404).json({ 
      success: false,
      error: "Booking not found" 
    });
  }
};

export const updateBooking = async (req, res) => {
  try {
    const { 
      paymentType, 
      amountPaid, 
      remainingAmount,
      ...updateData 
    } = req.body;

    // Handle payment amount updates
    if (amountPaid !== undefined || remainingAmount !== undefined) {
      const booking = await Booking.findById(req.params.id);
      
      if (booking) {
        // Calculate new values if needed
        const newAmountPaid = amountPaid !== undefined ? parseFloat(amountPaid) : booking.amountPaid;
        const newRemainingAmount = remainingAmount !== undefined ? parseFloat(remainingAmount) : booking.remainingAmount;
        
        // Update payment status based on amounts
        if (newRemainingAmount === 0) {
          updateData.paymentStatus = 'paid';
        } else if (newAmountPaid > 0) {
          updateData.paymentStatus = 'partially_paid';
        } else {
          updateData.paymentStatus = 'pending';
        }
      }
    }

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      {
        ...updateData,
        ...(paymentType && { paymentType }),
        ...(amountPaid !== undefined && { amountPaid: parseFloat(amountPaid) }),
        ...(remainingAmount !== undefined && { remainingAmount: parseFloat(remainingAmount) })
      },
      { new: true, runValidators: true }
    ).populate("location");
    
    if (!booking) {
      return res.status(404).json({ 
        success: false,
        error: "Booking not found" 
      });
    }
    
    res.json({
      success: true,
      message: "Booking updated successfully",
      booking
    });
  } catch (err) {
    console.error("Update booking error:", err);
    res.status(400).json({ 
      success: false,
      error: err.message 
    });
  }
};

export const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus, amountPaid, remainingAmount, paymentType } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: "Booking not found"
      });
    }

    const updateData = {};
    
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (amountPaid !== undefined) updateData.amountPaid = parseFloat(amountPaid);
    if (remainingAmount !== undefined) updateData.remainingAmount = parseFloat(remainingAmount);
    if (paymentType) updateData.paymentType = paymentType;

    // Auto-calculate remaining amount if not provided
    if (amountPaid !== undefined && remainingAmount === undefined) {
      updateData.remainingAmount = Math.max(0, booking.pricing.totalPrice - parseFloat(amountPaid));
    }

    const updatedBooking = await Booking.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate("location");

    res.json({
      success: true,
      message: "Payment status updated successfully",
      booking: updatedBooking
    });
  } catch (err) {
    console.error("Update payment status error:", err);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

export const getBookingsByPaymentType = async (req, res) => {
  try {
    const { paymentType } = req.params;
    const { status } = req.query;

    const filter = { paymentType };
    if (status) filter.paymentStatus = status;

    const bookings = await Booking.find(filter)
      .populate("location")
      .sort({ createdAt: -1 });

    // Calculate payment statistics
    const stats = await Booking.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: "$amountPaid" },
          totalRemaining: { $sum: "$remainingAmount" },
          paidBookings: {
            $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, 1, 0] }
          },
          pendingBookings: {
            $sum: { $cond: [{ $eq: ["$paymentStatus", "pending"] }, 1, 0] }
          }
        }
      }
    ]);

    const statistics = stats[0] ? {
      totalBookings: stats[0].totalBookings,
      totalRevenue: stats[0].totalRevenue,
      totalRemaining: stats[0].totalRemaining,
      paidBookings: stats[0].paidBookings,
      pendingBookings: stats[0].pendingBookings
    } : {
      totalBookings: 0,
      totalRevenue: 0,
      totalRemaining: 0,
      paidBookings: 0,
      pendingBookings: 0
    };

    res.json({
      success: true,
      paymentType,
      statistics,
      count: bookings.length,
      bookings
    });
  } catch (err) {
    console.error("Get bookings by payment type error:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

export const deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findByIdAndDelete(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: "Booking not found",
      });
    }

    res.json({
      success: true,
      message: "Booking deleted successfully",
      booking, // Optional: return deleted booking details
    });
  } catch (err) {
    console.error("Delete booking error:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

// Utility function to get payment analytics
export const getPaymentAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    const analytics = await Booking.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: "$paymentType",
          totalBookings: { $sum: 1 },
          totalAmountPaid: { $sum: "$amountPaid" },
          totalRemainingAmount: { $sum: "$remainingAmount" },
          totalRevenue: { $sum: "$pricing.totalPrice" },
          paidBookings: {
            $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, 1, 0] }
          },
          pendingBookings: {
            $sum: { $cond: [{ $eq: ["$paymentStatus", "pending"] }, 1, 0] }
          },
          averagePayment: { $avg: "$amountPaid" }
        }
      }
    ]);

    // Calculate overall totals
    const overall = await Booking.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          totalAmountPaid: { $sum: "$amountPaid" },
          totalRemainingAmount: { $sum: "$remainingAmount" },
          totalRevenue: { $sum: "$pricing.totalPrice" },
          collectionRate: {
            $avg: {
              $divide: ["$amountPaid", "$pricing.totalPrice"]
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      analytics,
      overall: overall[0] || {
        totalBookings: 0,
        totalAmountPaid: 0,
        totalRemainingAmount: 0,
        totalRevenue: 0,
        collectionRate: 0
      },
      timeframe: {
        startDate,
        endDate
      }
    });
  } catch (err) {
    console.error("Get payment analytics error:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};