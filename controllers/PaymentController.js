import Razorpay from "razorpay";
import crypto from "crypto";
import Payment from "../models/Payment.js";
import Booking from "../models/Booking.js";

// Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create order
export const createOrder = async (req, res) => {
  try {
    const { bookingId, amount, currency = "INR" } = req.body;

    const options = { amount: amount * 100, currency, receipt: `rcpt_${bookingId}` };
    const order = await razorpay.orders.create(options);

    const payment = new Payment({
      bookingId,
      razorpayOrderId: order.id,
      amount,
      currency,
      status: "created",
    });
    await payment.save();

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Verify payment
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      const payment = await Payment.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        { razorpayPaymentId: razorpay_payment_id, razorpaySignature: razorpay_signature, status: "paid" },
        { new: true }
      );

      // Update booking status
      await Booking.findByIdAndUpdate(payment.bookingId, { status: "confirmed" });

      res.json({ success: true, payment });
    } else {
      res.status(400).json({ error: "Invalid signature" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
