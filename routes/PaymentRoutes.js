import express from "express";
import {
  createOrder,
  verifyPayment,
} from "../controllers/PaymentController.js";

const router = express.Router();

router.post("/order", createOrder);     // Step 1: Create Razorpay order
router.post("/verify", verifyPayment);  // Step 2: Verify & confirm booking

export default router;
