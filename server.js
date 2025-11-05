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
try {
  validateEnvironment();
} catch (error) {
  console.error('Environment validation failed:', error.message);
}

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

// CORS configuration - Environment specific with Vercel deployment support
const allowedOrigins = isProduction 
  ? [
      process.env.FRONTEND_URL,
      process.env.ADMIN_FRONTEND_URL,
      "https://frontend-lilac-seven-36.vercel.app",
      "https://restand-relax-admin-frontend.vercel.app"
    ].filter(Boolean)
  : [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5174",
      process.env.FRONTEND_URL,
      process.env.ADMIN_FRONTEND_URL,
    ].filter(Boolean);

// Log CORS config for debugging
console.log('🛡️ CORS Configuration:', {
  environment: process.env.NODE_ENV || 'development',
  allowedOrigins: allowedOrigins,
  isProduction
});

// SINGLE CORS CONFIGURATION
app.use(
  cors({
    origin: function (origin, callback) {
      console.log('🔍 Incoming request from origin:', origin);
      
      // Allow requests with no origin (mobile apps, Postman, curl, serverless functions)
      if (!origin) {
        console.log('✅ Allowing request with no origin');
        return callback(null, true);
      }
      
      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        console.log('✅ Origin allowed:', origin);
        return callback(null, true);
      }
      
      // Allow all Vercel preview deployments for your project
      if (isProduction) {
        const vercelPatterns = [
          /^https:\/\/.*-noontechstudios-projects\.vercel\.app$/,
          /^https:\/\/restand-relax-.*\.vercel\.app$/,
          /^https:\/\/frontend-.*\.vercel\.app$/,
        ];
        
        const isVercelDomain = vercelPatterns.some(pattern => pattern.test(origin));
        if (isVercelDomain) {
          console.log('✅ Vercel preview domain allowed:', origin);
          return callback(null, true);
        }
      }
      
      // Block all other origins
      console.warn('🚫 CORS blocked request from origin:', origin);
      console.warn('Allowed origins:', allowedOrigins);
      callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    credentials: true,
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'X-Requested-With',
      'Accept',
      'Origin'
    ],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: isProduction ? 86400 : 0,
    preflightContinue: false,
    optionsSuccessStatus: 204
  })
);

// OPTIONS request handler (CORS preflight)
app.options('*', cors());

// Body parsing with consistent limits
app.use(express.json({ 
  limit: '10mb'  // Reduced from 50mb to prevent timeouts
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb'  // Reduced from 50mb
}));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// OPTIMIZED Database connection for Vercel serverless
let cachedDb = null;

const initializeDatabase = async () => {
  // If already connected, reuse the connection
  if (cachedDb && mongoose.connection.readyState === 1) {
    console.log('✅ Using cached database connection');
    return cachedDb;
  }

  try {
    // Configure mongoose for serverless
    mongoose.set('strictQuery', false);
    mongoose.set('bufferCommands', false);
    
    // Connect with optimized settings for Vercel
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 10000,
      maxPoolSize: 1, // Limit connection pool for serverless
      minPoolSize: 0,
      maxIdleTimeMS: 10000,
      family: 4 // Use IPv4
    });
    
    cachedDb = conn;
    console.log('✅ New database connection established');
    return cachedDb;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    cachedDb = null;
    throw error;
  }
};

// Middleware to ensure DB connection - NON-BLOCKING
app.use(async (req, res, next) => {
  try {
    await initializeDatabase();
    next();
  } catch (error) {
    console.error('Database middleware error:', error);
    res.status(503).json({
      success: false,
      error: 'Database connection failed',
      message: isProduction ? 'Service temporarily unavailable' : error.message
    });
  }
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
app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState;
    const statusMap = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    res.json({
      success: true,
      message: 'Server is running on Vercel',
      environment: process.env.NODE_ENV || 'production',
      timestamp: new Date().toISOString(),
      platform: 'Vercel Serverless',
      database: statusMap[dbStatus] || 'unknown',
      allowedOrigins: allowedOrigins
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
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
      error: 'CORS policy: Origin not allowed',
      origin: req.headers.origin
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

// Initialize Razorpay config (non-blocking)
try {
  validateRazorpayConfig();
  console.log('✅ Razorpay config validated');
} catch (error) {
  console.error('⚠️ Razorpay config validation failed:', error.message);
}

// For local development only
if (process.env.VERCEL !== '1') {
  const startServer = async () => {
    try {
      await initializeDatabase();
      const PORT = process.env.PORT || 5001;
      
      const server = app.listen(PORT, () => {
        console.log(`✅ Server running on port ${PORT}`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🛡️ CORS allowed origins: ${allowedOrigins.join(', ')}`);
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
}

export default app;