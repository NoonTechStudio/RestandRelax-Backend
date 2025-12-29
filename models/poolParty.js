// models/PoolParty.js
import mongoose from "mongoose";

const PoolPartySchema = new mongoose.Schema({
  locationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Location', 
    required: true 
  },
  locationName: { type: String, required: true },
  timings: [{
    session: { type: String, required: true }, // 'Morning', 'Evening', 'Full Day'
    startTime: { type: String, required: true }, // Format: '09:00'
    endTime: { type: String, required: true },   // Format: '12:00'
    capacity: { type: Number, required: true, min: 1 }, // Individual session capacity
    pricing: {
      perAdult: { type: Number, required: true },
      perKid: { type: Number, required: true }
    }
  }],
  totalCapacity: {
    type: Number,
    default: function() {
      return this.timings.reduce((sum, timing) => sum + timing.capacity, 0);
    }
  },
  // bookings: [{
  //   date: { type: Date, required: true },
  //   session: { type: String, required: true },
  //   adults: { type: Number, required: true },
  //   kids: { type: Number, required: true },
  //   bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'PoolPartyBooking' },
  //   createdAt: { type: Date, default: Date.now }
  // }],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Helper function to compare dates (ignoring time)
const isSameDate = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

// Calculate available capacity for a session on a specific date
PoolPartySchema.methods.getAvailableCapacity = async function(date, session) {
  const sessionConfig = this.timings.find(t => t.session === session);
  if (!sessionConfig) return 0;
  
  const checkDate = new Date(date);
  const startOfDay = new Date(checkDate.setHours(0, 0, 0, 0));
  const endOfDay = new Date(checkDate.setHours(23, 59, 59, 999));
  
  try {
    // Query PoolPartyBooking collection for bookings on this date/session
    const PoolPartyBooking = mongoose.model('PoolPartyBooking');
    
    const bookingsOnDate = await PoolPartyBooking.find({
      poolPartyId: this._id,
      bookingDate: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      session: session
    });
    
    const totalBooked = bookingsOnDate.reduce((sum, booking) => 
      sum + booking.adults + booking.kids, 0
    );
    
    return Math.max(0, sessionConfig.capacity - totalBooked);
  } catch (error) {
    console.error('Error calculating available capacity:', error);
    return 0;
  }
};

// Check if session is fully booked
PoolPartySchema.methods.isSessionAvailable = async function(date, session, guests) {
  const availableCapacity = await this.getAvailableCapacity(date, session);
  return availableCapacity >= guests;
};
// Get pricing for a specific session
PoolPartySchema.methods.getSessionPricing = function(session) {
  const sessionConfig = this.timings.find(t => t.session === session);
  return sessionConfig ? sessionConfig.pricing : null;
};

export default mongoose.model("PoolParty", PoolPartySchema);