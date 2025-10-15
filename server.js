import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import connectDB from "./config/db.js"; // ✅ use db.js
import locationRoutes from "./routes/LocationRoutes.js";
import locationImageRoutes from "./routes/LocationImageRoutes.js";
import bookingRoutes from "./routes/BookingRoutes.js";
import reviewRoutes from "./routes/review.js"
//import paymentRoutes from "./routes/PaymentRoutes.js";

dotenv.config();
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// Routes
app.use("/api/locations", locationRoutes);
app.use("/api/location-images", locationImageRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/reviews",reviewRoutes);
//app.use("/api/payments", paymentRoutes);

// DB + Server
connectDB(); // ✅ handled by db.js

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
