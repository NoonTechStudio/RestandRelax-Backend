import express from "express";
import {
  createOrder,
  verifyPayment,
  getPaymentStatus,
  getAllPayments,
  refundPayment,
  processAdminPayment,
  markAsPaid
} from "../controllers/PaymentController.js";
//import { handleWebhook } from "../controllers/webhookController.js";
import { paymentLimiter } from "../middleware/security.js";
import { sanitizeInput } from "../middleware/security.js";
import { authenticateAdmin } from "../middleware/auth.js";

const router = express.Router();

//router.post("/webhook", express.raw({type: 'application/json'}), handleWebhook);

// Public routes (for frontend payment processing)
router.post("/create-order", paymentLimiter, sanitizeInput, createOrder);
router.post("/verify", sanitizeInput, verifyPayment);
router.get("/status/:bookingId", getPaymentStatus);

// Admin only routes
router.get("/", authenticateAdmin, getAllPayments);
router.post("/:id/refund", authenticateAdmin, sanitizeInput, refundPayment);
router.post("/admin/process-payment", authenticateAdmin, sanitizeInput, processAdminPayment);
router.post("/admin/mark-paid", authenticateAdmin, sanitizeInput, markAsPaid);

export default router;