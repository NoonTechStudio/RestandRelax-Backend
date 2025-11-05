import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import mongoose from "mongoose";

import connectDB from "./config/db.js";
import { validateRazorpayConfig } from "./config/razorpay.js";
import locationRoutes from "./routes/LocationRoutes.js";
import locationImageRoutes from "./routes/LocationImageRoutes.js";
import bookingRoutes from "./routes/BookingRoutes.js";
import reviewRoutes from "./routes/review.js";
import heroimageRoutes from "./routes/HomepageHeroRoutes.js";
import paymentRoutes from "./routes/PaymentRoutes.js";
import adminRoutes from "./routes/AdminRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import validateEnvironment from "./config/envValidation.js";

// Security middleware
import {
  apiLimiter,
  securityHeaders,
  sanitizeInput
} from './middleware/security.js';

// Initialize environment variables
validateEnvironment();

// Environment configuration
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

console.log(`🚀 Starting server in ${process.env.NODE_ENV || 'development'} mode`);

const app = express();

// Enhanced security middleware with production optimizations
app.use(securityHeaders);
app.use(sanitizeInput);

// Apply rate limiting (adjust for Vercel's serverless environment)
if (process.env.VERCEL_ENV !== 'production') {
  app.use(apiLimiter);
}

// CORS configuration - Environment specific
const allowedOrigins = isProduction 
  ? [
      process.env.FRONTEND_URL,
      "https://your-frontend-app.vercel.app" // Replace with your actual frontend URL
    ].filter(Boolean)
  : [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5174",
      process.env.FRONTEND_URL,
    ].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (serverless functions, etc.)
      if (!origin) {
        return callback(null, true);
      }
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        if (isProduction) {
          console.warn(`🚫 CORS blocked request from origin: ${origin}`);
        }
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS","PATCH"],
    credentials: true,
    maxAge: isProduction ? 86400 : 0
  })
);

// Body parsing with consistent limits
app.use(express.json({ 
  limit: '50mb'
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '50mb' 
}));

// Request logging middleware (always enabled for Vercel)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ===== ROUTES =====
app.use("/api/locations", locationRoutes);
app.use("/api/location-images", locationImageRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/homepage-hero", heroimageRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/dashboard", dashboardRoutes);

// ===== HEALTH CHECK =====
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running on Vercel',
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString(),
    platform: 'Vercel Serverless'
  });
});

// ===== ROOT ENDPOINT =====
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Rest & Relax Backend API - Deployed on Vercel',
    environment: process.env.NODE_ENV || 'production',
    version: '1.0.0',
    documentation: '/api/health'
  });
});

// ===== 404 HANDLER =====
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// ===== GLOBAL ERROR HANDLER =====
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  // CORS error handling
  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      error: 'CORS policy: Origin not allowed'
    });
  }
  
  // JSON parsing error
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON in request body'
    });
  }
  
  // Rate limiting error
  if (error.status === 429) {
    return res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later'
    });
  }
  
  // Default error response
  const errorResponse = {
    success: false,
    error: isProduction ? 'Internal server error' : error.message
  };
  
  // Include stack trace only in development
  if (isDevelopment) {
    errorResponse.stack = error.stack;
    errorResponse.details = error.toString();
  }
  
  res.status(error.status || 500).json(errorResponse);
});

// Initialize database connection (for serverless compatibility)
const initializeApp = async () => {
  try {
    await connectDB();
    validateRazorpayConfig();
    console.log('✅ Database and services initialized');
  } catch (error) {
    console.error('❌ Failed to initialize app:', error);
    // Don't exit process in serverless environment
  }
};

// Initialize the app (but don't start listening on Vercel)
if (process.env.VERCEL !== '1') {
  // Local development - start server normally
  const startServer = async () => {
    try {
      await initializeApp();
      const PORT = process.env.PORT || 5001;
      
      const server = app.listen(PORT, () => {
        console.log(`✅ Server running on port ${PORT}`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🛡️  CORS allowed origins: ${allowedOrigins.join(', ')}`);
      });

      // Graceful shutdown for local development
      const gracefulShutdown = async (signal) => {
        console.log(`\n${signal} received, shutting down gracefully...`);
        
        server.close((err) => {
          if (err) {
            console.error('Error closing server:', err);
          } else {
            console.log('✅ HTTP server closed');
          }
          
          mongoose.connection.close(false, () => {
            console.log('✅ MongoDB connection closed');
            process.exit(0);
          });
        });
        
        setTimeout(() => {
          console.log('⚠️ Forcing shutdown after timeout');
          process.exit(1);
        }, 10000);
      };

      process.on('SIGINT', () => gracefulShutdown('SIGINT'));
      process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    } catch (error) {
      console.error('💥 Failed to start server:', error);
      process.exit(1);
    }
  };

  startServer();
} else {
  // Vercel environment - just initialize services
  initializeApp();
}

export default app;