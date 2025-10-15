import Booking from "../models/Booking.js";

// Create booking with API integration
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
      pricing = {}
    } = req.body;

    // Check for existing booking on the same dates
    const existingBooking = await Booking.findOne({
      location: locationId,
      $or: [
        {
          checkInDate: { $lte: new Date(checkOutDate) },
          checkOutDate: { $gte: new Date(checkInDate) }
        }
      ]
    });

    if (existingBooking) {
      return res.status(400).json({ 
        error: "These dates are already booked! Please select different dates." 
      });
    }

    // Create new booking
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
      pricing: {
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

// Enhanced getBookedDates function with PROPER date handling
export const getBookedDates = async (req, res) => {
  try {
    const { locationId } = req.params;
    
    if (!locationId) {
      return res.status(400).json({
        success: false,
        error: "Location ID is required"
      });
    }

    // Find all bookings for this location
    const bookings = await Booking.find({
      location: locationId,
      paymentStatus: { $in: ["pending", "paid"] }
    }).select('checkInDate checkOutDate paymentStatus');

    console.log(`Found ${bookings.length} bookings for location ${locationId}`);

    const bookedDates = [];
    
    bookings.forEach(booking => {
      console.log(`Processing booking:`, {
        id: booking._id,
        checkIn: booking.checkInDate,
        checkOut: booking.checkOutDate,
        status: booking.paymentStatus
      });
      
      const start = new Date(booking.checkInDate);
      const end = new Date(booking.checkOutDate);
      
      // Normalize dates to avoid timezone issues
      const normalizedStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const normalizedEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      
      const currentDate = new Date(normalizedStart);
      
      // Add all dates between check-in and check-out (exclusive of check-out)
      while (currentDate < normalizedEnd) {
        bookedDates.push({
          date: new Date(currentDate), // Store as Date object
          status: booking.paymentStatus
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });

    console.log(`Generated ${bookedDates.length} booked date entries:`, 
      bookedDates.map(bd => ({ date: bd.date.toISOString().split('T')[0], status: bd.status }))
    );

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

// Keep other functions as they are...
export const getBookings = async (req, res) => {
  try {
    const bookings = await Booking.find().populate("location");
    res.json({
      success: true,
      count: bookings.length,
      bookings
    });
  } catch (err) {
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
    res.json({
      success: true,
      booking
    });
  } catch (err) {
    res.status(404).json({ 
      success: false,
      error: "Booking not found" 
    });
  }
};

export const updateBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      req.body,
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
    res.status(400).json({ 
      success: false,
      error: err.message 
    });
  }
};