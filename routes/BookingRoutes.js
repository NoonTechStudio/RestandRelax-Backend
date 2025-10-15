import express from "express";
import {
  createBooking,
  getBookings,
  getBookingById,
  updateBooking,
  getBookedDates // ADD THIS
} from "../controllers/BookingController.js";

const router = express.Router();

router.post("/", createBooking);
router.get("/", getBookings);
router.get("/:id", getBookingById);
router.put("/:id", updateBooking);
router.get("/dates/:locationId", getBookedDates); // ADD THIS ROUTE

export default router;