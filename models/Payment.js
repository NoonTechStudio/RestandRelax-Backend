import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    razorpayOrderId: { 
      type: String, 
      required: true,
      index: true
    },
    razorpayPaymentId: { 
      type: String,
      index: true
    },
    razorpaySignature: { type: String },
    amount: { 
      type: Number, 
      required: true 
    },
    currency: { 
      type: String, 
      default: "INR" 
    },
    status: {
      type: String,
      enum: ["created", "paid", "failed", "refunded", "partially_refunded"],
      default: "created",
    },
    userEmail: { type: String },
    userPhone: { type: String },
    
    // Refund fields
    refundAmount: { type: Number },
    refundNotes: { type: String },
    refundedAt: { type: Date },
    razorpayRefundId: { type: String },
    
    // Error details for failed payments
    errorDetails: { type: String },
    
    // ADMIN-ONLY FIELDS (Optional - can be added without breaking user side)
    adminNotes: { type: String }, // For internal admin comments
    updatedBy: { 
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin" 
    }, // Track admin who updated
    isRetry: { type: Boolean, default: false }, // If this is a retry payment
    originalPaymentId: { 
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment" 
    } // Reference to original failed payment
  },
  { 
    timestamps: true 
  }
);

// Indexes for better query performance
paymentSchema.index({ bookingId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ createdAt: 1 });
paymentSchema.index({ razorpayOrderId: 1, razorpayPaymentId: 1 });
paymentSchema.index({ isRetry: 1 }); // New index for retry payments

// Virtual for formatted amount
paymentSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: this.currency
  }).format(this.amount);
});

// Virtual for payment age (how long since created)
paymentSchema.virtual('paymentAge').get(function() {
  return Date.now() - this.createdAt;
});

export default mongoose.model("Payment", paymentSchema);