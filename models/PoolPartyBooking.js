import mongoose from "mongoose";

const PoolPartyBookingSchema = new mongoose.Schema({
  poolPartyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PoolParty',
    required: true
  },
  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: true
  },
  guestName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true // NEW: Added address field
  },
  bookingDate: {
    type: Date,
    required: true
  },
  session: {
    type: String,
    enum: ['Morning', 'Evening', 'Full Day'],
    required: true
  },
  adults: {
    type: Number,
    required: true,
    min: 1
  },
  kids: {
    type: Number,
    default: 0
  },
  totalGuests: {
    type: Number,
    required: true
  },
  
  // UPDATED: Enhanced pricing structure
  pricing: {
    pricePerAdult: { type: Number, required: true },
    pricePerKid: { type: Number, required: true },
    totalPrice: { type: Number, required: true }
  },
  
  // NEW: Payment type and amounts (matching simple booking)
  paymentType: {
    type: String,
    enum: ['full', 'token'],
    default: 'full'
  },
  amountPaid: {
    type: Number,
    default: 0
  },
  remainingAmount: {
    type: Number,
    default: 0
  },
  
  // UPDATED: Payment status to match simple booking
  paymentStatus: {
    type: String,
    enum: ['pending', 'partially_paid', 'paid', 'failed'],
    default: 'pending'
  },
  
  // Payment gateway fields
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  razorpaySignature: { type: String },
  
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for better query performance
PoolPartyBookingSchema.index({ poolPartyId: 1, bookingDate: 1 });
PoolPartyBookingSchema.index({ locationId: 1 });
PoolPartyBookingSchema.index({ paymentStatus: 1 });
PoolPartyBookingSchema.index({ paymentType: 1 });

// Virtual for payment summary
PoolPartyBookingSchema.virtual('paymentSummary').get(function() {
  return {
    type: this.paymentType,
    paid: this.amountPaid,
    remaining: this.remainingAmount,
    total: this.pricing.totalPrice,
    status: this.paymentStatus
  };
});

export default mongoose.model("PoolPartyBooking", PoolPartyBookingSchema);