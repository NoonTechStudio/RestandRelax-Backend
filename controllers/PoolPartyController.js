import mongoose from "mongoose";
import PoolParty from "../models/poolParty.js";
import PoolPartyBooking from "../models/PoolPartyBooking.js";

export const createPoolParty = async (req, res) => {
  try {
    // Calculate total capacity from all sessions
    const totalCapacity = req.body.timings.reduce((sum, timing) => sum + timing.capacity, 0);
    const poolParty = new PoolParty({
      ...req.body,
      totalCapacity // This will be calculated automatically, but we also set it explicitly
    });
    await poolParty.save();
    res.status(201).json(poolParty);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const updatePoolParty = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('Update pool party ID:', id);
    console.log('Request body:', req.body);
    
    // Validate timings exists in request body
    if (!req.body.timings || !Array.isArray(req.body.timings)) {
      return res.status(400).json({ 
        error: "Timings array is required" 
      });
    }
    
    // Validate each timing has required fields
    for (let i = 0; i < req.body.timings.length; i++) {
      const timing = req.body.timings[i];
      if (!timing.session || !timing.startTime || !timing.endTime || timing.capacity === undefined) {
        return res.status(400).json({ 
          error: `Timing at index ${i} is missing required fields` 
        });
      }
      
      // Ensure pricing exists
      if (!timing.pricing) {
        timing.pricing = { perAdult: 0, perKid: 0 };
      }
    }
    
    // Calculate total capacity from all sessions
    const totalCapacity = req.body.timings.reduce((sum, timing) => {
      return sum + (parseInt(timing.capacity) || 0);
    }, 0);
    
    req.body.totalCapacity = totalCapacity;
    
    // Keep existing bookings when updating
    let existingPoolParty;
    if (mongoose.Types.ObjectId.isValid(id)) {
      existingPoolParty = await PoolParty.findById(id);
    }
    
    if (!existingPoolParty) {
      existingPoolParty = await PoolParty.findOne({ locationId: id });
    }
    
    if (!existingPoolParty) {
      return res.status(404).json({ 
        error: "Pool party not found" 
      });
    }
    
    // Preserve existing bookings when updating
    if (existingPoolParty.bookings) {
      req.body.bookings = existingPoolParty.bookings;
    }
    
    // Update the pool party
    const poolParty = await PoolParty.findByIdAndUpdate(
      existingPoolParty._id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!poolParty) {
      return res.status(404).json({ 
        error: "Pool party not found after update" 
      });
    }
    
    res.json(poolParty);
  } catch (err) {
    console.error('Update pool party error:', err);
    res.status(400).json({ error: err.message });
  }
};

export const getPoolPartyByLocationId = async (req, res) => {
  try {
    const poolParty = await PoolParty.findOne({ locationId: req.params.locationId });
    if (!poolParty) return res.status(404).json({ error: "Pool party not found" });
    res.json(poolParty);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getPoolPartyById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid pool party ID format" 
      });
    }
    
    const poolParty = await PoolParty.findById(id);
    
    if (!poolParty) {
      return res.status(404).json({ 
        success: false,
        error: "Pool party not found" 
      });
    }
    
    res.json({
      success: true,
      poolParty
    });
    
  } catch (err) {
    console.error('Get pool party by ID error:', err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

export const deletePoolParty = async (req, res) => {
  try {
    const poolParty = await PoolParty.findOneAndDelete({ locationId: req.params.locationId });
    if (!poolParty) {
      return res.status(404).json({
        success: false,
        error: "Pool party not found",
      });
    }
    res.json({
      success: true,
      message: "Pool party deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const checkPoolPartyAvailability = async (req, res) => {
  try {
    const { locationId } = req.params; // from params, not query
    const { date, session, guests } = req.query;
    
    console.log('Check Availability - Location ID:', locationId);
    console.log('Check Availability - Query:', req.query);
    
    if (!locationId) {
      return res.status(400).json({ 
        success: false,
        error: "Location ID is required" 
      });
    }
    
    // Check both as ObjectId and as string
    let poolParty;
    if (mongoose.Types.ObjectId.isValid(locationId)) {
      poolParty = await PoolParty.findOne({ 
        locationId: new mongoose.Types.ObjectId(locationId) 
      });
    } else {
      // Try as string if not valid ObjectId
      poolParty = await PoolParty.findOne({ locationId: locationId });
    }
    
    if (!poolParty) {
      return res.status(404).json({ 
        success: false,
        error: "Pool party not found for this location" 
      });
    }
    
    if (!date || !session) {
      return res.status(400).json({ 
        success: false,
        error: "Date and session are required" 
      });
    }
    
    const bookingDate = new Date(date);
    
    // Use the async method from the updated PoolParty model
    const isAvailable = await poolParty.isSessionAvailable(bookingDate, session, parseInt(guests || 0));
    const availableCapacity = await poolParty.getAvailableCapacity(bookingDate, session);
    const sessionConfig = poolParty.timings.find(t => t.session === session);
    
    res.json({
      success: true,
      isAvailable,
      availableCapacity,
      totalCapacity: sessionConfig ? sessionConfig.capacity : 0,
      booked: sessionConfig ? sessionConfig.capacity - availableCapacity : 0,
      pricing: sessionConfig ? sessionConfig.pricing : null,
      locationName: poolParty.locationName
    });
  } catch (err) {
    console.error('Check availability error:', err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

export const getAllSessionsAvailability = async (req, res) => {
  try {
    const { locationId } = req.params;
    const { date } = req.query;
    
    console.log('Get All Sessions - Location ID:', locationId);
    console.log('Get All Sessions - Date:', date);
    
    if (!locationId) {
      return res.status(400).json({ 
        success: false,
        error: "Location ID is required" 
      });
    }
    
    if (!date) {
      return res.status(400).json({ 
        success: false,
        error: "Date is required" 
      });
    }
    
    let poolParty;
    if (mongoose.Types.ObjectId.isValid(locationId)) {
      poolParty = await PoolParty.findOne({ 
        locationId: new mongoose.Types.ObjectId(locationId) 
      });
    } else {
      poolParty = await PoolParty.findOne({ locationId: locationId });
    }
    
    if (!poolParty) {
      return res.status(404).json({ 
        success: false,
        error: "Pool party not found for this location" 
      });
    }
    
    const bookingDate = new Date(date);
    
    if (isNaN(bookingDate.getTime())) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid date format" 
      });
    }
    
    const startOfDay = new Date(bookingDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(bookingDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Query bookings for this date from PoolPartyBooking collection
    const bookingsOnDate = await PoolPartyBooking.find({
      poolPartyId: poolParty._id,
      bookingDate: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });
    
    console.log('=== AVAILABILITY CALCULATION DEBUG ===');
    console.log('Checking bookings for date:', bookingDate.toISOString().split('T')[0]);
    console.log('Total bookings from PoolPartyBooking collection:', bookingsOnDate.length);
    console.log('All bookings:', JSON.stringify(bookingsOnDate, null, 2));
    
    // Calculate availability for each session
    const sessionsAvailability = await Promise.all(
      poolParty.timings.map(async (timing) => {
        const bookingsForSession = bookingsOnDate.filter(b => b.session === timing.session);
        const totalBooked = bookingsForSession.reduce((sum, b) => sum + b.adults + b.kids, 0);
        const availableCapacity = Math.max(0, timing.capacity - totalBooked);
        
        console.log(`=== Session ${timing.session} ===`);
        console.log('  - Total Capacity:', timing.capacity);
        console.log('  - Booked:', totalBooked);
        console.log('  - Available Capacity:', availableCapacity);
        
        return {
          session: timing.session,
          startTime: timing.startTime,
          endTime: timing.endTime,
          totalCapacity: timing.capacity,
          availableCapacity,
          booked: totalBooked,
          isAvailable: availableCapacity > 0,
          pricing: timing.pricing
        };
      })
    );
    
    res.json({
      success: true,
      date: bookingDate.toISOString().split('T')[0],
      locationId: locationId,
      locationName: poolParty.locationName,
      sessions: sessionsAvailability
    });
    
  } catch (err) {
    console.error('Get all sessions availability error:', err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

// Add payment status update function
export const updatePoolPartyPaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus, amountPaid, remainingAmount, paymentType } = req.body;

    const booking = await PoolPartyBooking.findById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: "Pool party booking not found"
      });
    }

    const updateData = {};
    
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (amountPaid !== undefined) updateData.amountPaid = parseFloat(amountPaid);
    if (remainingAmount !== undefined) updateData.remainingAmount = parseFloat(remainingAmount);
    if (paymentType) updateData.paymentType = paymentType;

    // Auto-calculate remaining amount if not provided
    if (amountPaid !== undefined && remainingAmount === undefined) {
      const totalAmount = booking.pricing.totalPrice || booking.pricing.totalAmount || 0;
      updateData.remainingAmount = Math.max(0, totalAmount - parseFloat(amountPaid));
    }

    const updatedBooking = await PoolPartyBooking.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('poolPartyId', 'locationName timings')
     .populate('locationId', 'name address city state');

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

// Add mark as paid function
export const markPoolPartyAsPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const booking = await PoolPartyBooking.findById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: "Pool party booking not found"
      });
    }

    // Update booking
    booking.paymentStatus = 'paid';
    booking.amountPaid = booking.pricing.totalPrice || booking.pricing.totalAmount || 0;
    booking.remainingAmount = 0;
    booking.paymentType = 'full';
    await booking.save();

    res.json({
      success: true,
      message: "Pool party booking marked as paid successfully",
      booking
    });
  } catch (err) {
    console.error("Mark as paid error:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// NEW: Create pool party booking
export const createPoolPartyBooking = async (req, res) => {
  try {
    const {
      poolPartyId,
      locationId,
      guestName,
      email,
      phone,
      address, // NEW: Added address
      bookingDate,
      session,
      adults,
      kids,
      paymentType = 'full', // NEW: Added payment type
      amountPaid = 0, // NEW: Added amount paid
      remainingAmount = 0 // NEW: Added remaining amount
    } = req.body;
    
    // Check availability
    const poolParty = await PoolParty.findById(poolPartyId);
    if (!poolParty) {
      return res.status(404).json({ 
        success: false,
        error: "Pool party not found" 
      });
    }
    
    const totalGuests = parseInt(adults) + parseInt(kids);
    const isAvailable = await poolParty.isSessionAvailable(new Date(bookingDate), session, totalGuests);
    
    if (!isAvailable) {
      return res.status(400).json({
        success: false,
        error: "Not enough capacity for this session"
      });
    }
    
    // Get session pricing
    const sessionConfig = poolParty.timings.find(t => t.session === session);
    if (!sessionConfig) {
      return res.status(400).json({
        success: false,
        error: "Invalid session selected"
      });
    }
    
    const totalAmount = (sessionConfig.pricing.perAdult * parseInt(adults)) + 
                       (sessionConfig.pricing.perKid * parseInt(kids));
    
    // Determine payment status based on amounts
    // let paymentStatus = 'pending';
    // if (paymentType === 'full' && amountPaid >= totalAmount) {
    //   paymentStatus = 'paid';
    // } else if (amountPaid > 0 && amountPaid < totalAmount) {
    //   paymentStatus = 'partially_paid';
    // }
    
    // Create booking with payment details
    const booking = new PoolPartyBooking({
      poolPartyId,
      locationId,
      guestName,
      email,
      phone,
      address: address || '', // NEW: Added address
      bookingDate: new Date(bookingDate),
      session,
      adults: parseInt(adults),
      kids: parseInt(kids),
      totalGuests,
      pricing: {
        pricePerAdult: sessionConfig.pricing.perAdult,
        pricePerKid: sessionConfig.pricing.perKid,
        totalPrice: totalAmount
      },
      paymentType,
      amountPaid: parseFloat(amountPaid),
      remainingAmount: parseFloat(remainingAmount),
      paymentStatus: 'pending',
    });
    
    await booking.save();
    
    res.status(201).json({
      success: true,
      message: "Pool party booking created successfully",
      booking
    });
    
  } catch (err) {
    console.error('Create booking error:', err);
    res.status(400).json({ error: err.message });
  }
};

// GET all pool party bookings (with optional filters)
export const getPoolPartyBookings = async (req, res) => {
  try {
    const { 
      poolPartyId, 
      locationId, 
      date, 
      session, 
      paymentStatus,
      startDate,
      endDate,
      page = 1,
      limit = 10
    } = req.query;
    
    const query = {};
    
    // FIX: Handle poolPartyId query
    if (poolPartyId) {
      if (mongoose.Types.ObjectId.isValid(poolPartyId)) {
        query.poolPartyId = new mongoose.Types.ObjectId(poolPartyId);
      } else {
        query.poolPartyId = poolPartyId;
      }
    }
    
    // FIX: Handle locationId query
    if (locationId) {
      if (mongoose.Types.ObjectId.isValid(locationId)) {
        query.locationId = new mongoose.Types.ObjectId(locationId);
      } else {
        query.locationId = locationId;
      }
    }
    
    if (date) {
      const searchDate = new Date(date);
      const nextDay = new Date(searchDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      query.bookingDate = {
        $gte: searchDate,
        $lt: nextDay
      };
    }
    
    if (session) {
      query.session = session;
    }
    
    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }
    
    // Date range filter
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      
      query.bookingDate = {
        $gte: start,
        $lt: end
      };
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const bookings = await PoolPartyBooking.find(query)
      .populate('poolPartyId', 'locationName timings totalCapacity')
      .populate('locationId', 'name address city state')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await PoolPartyBooking.countDocuments(query);
    
    res.json({
      success: true,
      count: bookings.length,
      bookings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (err) {
    console.error('Get pool party bookings error:', err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

// UPDATE pool party booking
export const updatePoolPartyBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Validate booking ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid booking ID format" 
      });
    }
    
    // Find the booking
    const booking = await PoolPartyBooking.findById(id);
    if (!booking) {
      return res.status(404).json({ 
        success: false,
        error: "Booking not found" 
      });
    }
    
    // If changing date/session/guests, check availability
    if (updateData.bookingDate || updateData.session || updateData.adults || updateData.kids) {
      const poolParty = await PoolParty.findById(booking.poolPartyId);
      if (!poolParty) {
        return res.status(404).json({ 
          success: false,
          error: "Pool party not found" 
        });
      }
      
      const bookingDate = new Date(updateData.bookingDate || booking.bookingDate);
      const session = updateData.session || booking.session;
      const adults = parseInt(updateData.adults || booking.adults);
      const kids = parseInt(updateData.kids || booking.kids);
      const totalGuests = adults + kids;
      
      // Check availability using the PoolParty model's async method
      const availableCapacity = await poolParty.getAvailableCapacity(bookingDate, session);
      
      // For updates, we need to check capacity excluding current booking
      const startOfDay = new Date(bookingDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(bookingDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      // Get all other bookings for the same date and session
      const otherBookings = await PoolPartyBooking.find({
        poolPartyId: booking.poolPartyId,
        bookingDate: {
          $gte: startOfDay,
          $lte: endOfDay
        },
        session: session,
        _id: { $ne: booking._id } // Exclude current booking
      });
      
      const totalBookedByOthers = otherBookings.reduce((sum, b) => sum + b.adults + b.kids, 0);
      const sessionConfig = poolParty.timings.find(t => t.session === session);
      
      if (!sessionConfig) {
        return res.status(400).json({
          success: false,
          error: "Invalid session selected"
        });
      }
      
      const capacityAvailableForUpdate = Math.max(0, sessionConfig.capacity - totalBookedByOthers);
      
      if (capacityAvailableForUpdate < totalGuests) {
        return res.status(400).json({
          success: false,
          error: "Not enough capacity for this session"
        });
      }
      
      // Update totalGuests in updateData
      updateData.totalGuests = totalGuests;
      
      // Calculate new pricing if guests changed
      if (updateData.adults || updateData.kids) {
        const sessionPricing = sessionConfig.pricing;
        if (sessionPricing) {
          updateData.pricing = {
            perAdult: sessionPricing.perAdult,
            perKid: sessionPricing.perKid,
            totalAmount: (sessionPricing.perAdult * adults) + (sessionPricing.perKid * kids)
          };
        }
      }
    }
    
    // Update the booking
    const updatedBooking = await PoolPartyBooking.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('poolPartyId', 'locationName timings');
    
    // NO LONGER update the bookings array in PoolParty model
    
    res.json({
      success: true,
      message: "Booking updated successfully",
      booking: updatedBooking
    });
    
  } catch (err) {
    console.error('Update pool party booking error:', err);
    res.status(400).json({ error: err.message });
  }
};

// DELETE pool party booking
export const deletePoolPartyBooking = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate booking ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid booking ID format" 
      });
    }
    
    // Find and delete the booking
    const booking = await PoolPartyBooking.findByIdAndDelete(id);
    
    if (!booking) {
      return res.status(404).json({ 
        success: false,
        error: "Booking not found" 
      });
    }
    
    // NO LONGER remove the booking from PoolParty model
    
    res.json({
      success: true,
      message: "Booking deleted successfully"
    });
    
  } catch (err) {
    console.error('Delete pool party booking error:', err);
    res.status(500).json({ error: err.message });
  }
};

// GET all pool parties (with pagination and filters)
export const getPoolPartys = async (req, res) => {
  try {
    const { 
      locationId, 
      isActive,
      search,
      page = 1,
      limit = 10
    } = req.query;
    
    const query = {};
    
    if (locationId) {
      if (mongoose.Types.ObjectId.isValid(locationId)) {
        query.locationId = new mongoose.Types.ObjectId(locationId);
      }
    }
    
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    if (search) {
      query.$or = [
        { locationName: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const poolParties = await PoolParty.find(query)
      .populate('locationId', 'name address')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await PoolParty.countDocuments(query);
    
    // Calculate booking count for each pool party
    const poolPartiesWithStats = await Promise.all(
      poolParties.map(async (poolParty) => {
        // Get total bookings count from PoolPartyBooking collection
        const bookingCount = await PoolPartyBooking.countDocuments({ 
          poolPartyId: poolParty._id 
        });
        
        // Get today's bookings count
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const todayBookingsCount = await PoolPartyBooking.countDocuments({
          poolPartyId: poolParty._id,
          bookingDate: {
            $gte: today,
            $lt: tomorrow
          }
        });
        
        return {
          ...poolParty.toObject(),
          stats: {
            totalBookings: bookingCount,
            bookedToday: todayBookingsCount,
            sessionsCount: poolParty.timings.length
          }
        };
      })
    );
    
    res.json({
      success: true,
      poolParties: poolPartiesWithStats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (err) {
    console.error('Get pool parties error:', err);
    res.status(500).json({ error: err.message });
  }
};