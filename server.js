import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import mongoose from "mongoose";

import connectDB from "./db.js";
import { validateRazorpayConfig } from "./razorpay.js";
import "./Cloudinary.js";

// Initialize environment variables
try {
  console.log('🔧 Environment validation started');
  // Basic env check
  const required = ['MONGO_URI', 'JWT_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.warn('⚠️ Missing environment variables:', missing);
  } else {
    console.log('✅ Environment variables validated');
  }
} catch (error) {
  console.error('Environment validation failed:', error.message);
}

const app = express();

// Basic security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "https://frontend-lilac-seven-36.vercel.app",
  "https://restand-relax-admin-frontend.vercel.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174", 
  "http://127.0.0.1:5174",
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Database connection middleware (non-blocking)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(503).json({
      success: false,
      error: 'Database connection failed',
      message: 'Service temporarily unavailable'
    });
  }
});

// ===== BASIC ROUTES =====
// Health check endpoint
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
      database: statusMap[dbStatus] || 'unknown',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Rest & Relax Backend API - Deployed on Vercel',
    environment: process.env.NODE_ENV || 'production',
    version: '1.0.0',
    status: 'operational'
  });
});

// ===== 404 HANDLER =====
app.use((req, res) => {
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
  
  // CORS error
  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      error: 'CORS policy: Origin not allowed',
      origin: req.headers.origin
    });
  }
  
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
  });
});

// Initialize Razorpay config
try {
  validateRazorpayConfig();
  console.log('✅ Razorpay config validated');
} catch (error) {
  console.error('⚠️ Razorpay config validation failed:', error.message);
}

// Export for Vercel
export default app;

// Local development server
if (process.env.VERCEL !== '1') {
  const PORT = process.env.PORT || 5001;
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}