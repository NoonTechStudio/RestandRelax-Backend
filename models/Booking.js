import mongoose from "mongoose";

const BookingSchema = new mongoose.Schema({
  location: { type: mongoose.Schema.Types.ObjectId, ref: "Location", required: true },

  // Snapshot of location at the time of booking
  locationSnapshot: {
    name: { type: String },
    address: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      pincode: String,
    },
    amenities: [String],
  },

  // Booking dates - UPDATED
  checkInDate: { type: Date, required: true },
  checkOutDate: { type: Date, required: true },

  // Guest info - UPDATED
  name: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true }, // ADDED
  adults: { type: Number, default: 1 },
  kids: { type: Number, default: 0 },
  
  // Food service - ADDED
  withFood: { type: Boolean, default: false },

  // REMOVED FIELDS (not provided by frontend):
  // email
  // specialRequests
  // propertyDetails (complex object)
  // timings object
  // date (replaced by checkInDate/checkOutDate)

  // Pricing - SIMPLIFIED
  pricing: {
    pricePerAdult: { type: Number, default: 0 },
    pricePerKid: { type: Number, default: 0 },
    //villaPrice: { type: Number, default: 0 },
    extraPersonCharge: { type: Number, default: 0 },
    totalPrice: { type: Number, required: true }
  },
  paymentType: { type: String, enum: ["full", "token"], default: "full" },
  amountPaid: { type: Number, default: 0 },
  remainingAmount: { type: Number, default: 0 },

  // Payment Fields
  paymentStatus: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  razorpaySignature: { type: String },

  createdAt: { type: Date, default: Date.now },
});

// UPDATED index for check-in date instead of single date
BookingSchema.index({ location: 1, checkInDate: 1 });


export default mongoose.model("Booking", BookingSchema);