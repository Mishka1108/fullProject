// index.js - მთლიანი კოდი
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const rateLimit = require('express-rate-limit');

// Environment configuration
dotenv.config();

// Express app initialization
const app = express();

// Optional: გააქტიურე strictQuery
mongoose.set('strictQuery', true);

// ✅ CORS კონფიგურაცია - პირველ რიგში!
app.use(cors({
  origin: [
    'https://market-zone.netlify.app',
    'https://www.imarketzone.ge',
    'http://localhost:4200', // Angular development
    'http://localhost:3000', // React development
    'http://localhost:8080', // Vue development
    process.env.CLIENT_URL
  ].filter(Boolean), // Remove undefined values
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  credentials: true,
  maxAge: 86400 // 24 hours preflight cache
}));

// ✅ Express middleware-ები სწორი თანმიმდევრობით
app.use(express.json({ 
  limit: '50mb',
  verify: (req, res, buf, encoding) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({ error: 'Invalid JSON' });
      throw new Error('Invalid JSON');
    }
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '50mb',
  parameterLimit: 1000
}));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Request logging middleware (development-ისთვის)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.originalUrl;
    const userAgent = req.get('User-Agent') || 'Unknown';
    const ip = req.ip || req.connection.remoteAddress || 'Unknown';
    
    console.log(`[${timestamp}] ${method} ${url} - IP: ${ip} - UA: ${userAgent.substring(0, 50)}`);
    next();
  });
}

// Rate limiting (production-ისთვის)
if (process.env.NODE_ENV === 'production') {
  const rateLimit = require('express-rate-limit');
  
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  
  app.use('/api/', limiter);
}

// Health check endpoints
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    service: 'MarketZone API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    service: 'MarketZone API',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Root endpoint - API documentation
app.get('/', (req, res) => {
  res.json({
    message: 'MarketZone API Server',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      api_health: '/api/health',
      auth: '/api/auth',
      admin: '/api/admin',
      users: '/api/users',
      products: '/api/products',
      contact: '/api/contact'
    },
    documentation: {
      products: {
        getAll: 'GET /api/products',
        getById: 'GET /api/products/:id',
        getBySlug: 'GET /api/products/by-slug/:slug', // ✅ ახალი endpoint
        getUserProducts: 'GET /api/products/user (requires auth)',
        addProduct: 'POST /api/products (requires auth)',
        updateProduct: 'PUT /api/products/:id (requires auth)',
        deleteProduct: 'DELETE /api/products/:id (requires auth)',
        getStats: 'GET /api/products/stats/categories'
      }
    }
  });
});

// ✅ API Routes - სწორი თანმიმდევრობით
app.use("/api/auth", require("./routes/auth"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/users", require("./routes/user"));
app.use("/api/products", require("./routes/product")); // ✅ slug support-ით
app.use("/api/contact", require("./routes/contactRoutes"));

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Global Error Handler:', {
    error: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      messages: errors
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      error: 'Duplicate Field',
      message: `${field} already exists`
    });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(404).json({
      success: false,
      error: 'Invalid ID Format',
      message: 'Resource not found'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid Token',
      message: 'Please log in again'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token Expired',
      message: 'Please log in again'
    });
  }

  // Multer errors (file upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: 'File Too Large',
      message: 'File size should not exceed 10MB'
    });
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      success: false,
      error: 'Too Many Files',
      message: 'Maximum 3 files allowed'
    });
  }

  // Default server error
  res.status(err.status || 500).json({
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong!' 
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { 
      stack: err.stack,
      details: err 
    })
  });
});

// Handle 404 for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      '/api/auth',
      '/api/admin', 
      '/api/users',
      '/api/products',
      '/api/contact'
    ]
  });
});

// Handle all other routes - redirect to frontend or API info
app.use('*', (req, res) => {
  // If it's an API request that doesn't exist, return 404
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      error: 'API endpoint not found',
      path: req.originalUrl
    });
  }

  // For non-API routes, return info about the API
  res.status(200).json({
    message: 'This is the MarketZone API server only',
    frontend: 'https://market-zone.netlify.app',
    website: 'https://www.imarketzone.ge',
    api_docs: req.protocol + '://' + req.get('host') + '/',
    requestedPath: req.originalUrl,
    suggestion: 'Use /api/* endpoints for API access'
  });
});

// Graceful shutdown handlers
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} signal received: starting graceful shutdown`);
  
  if (global.server) {
    console.log('Closing HTTP server...');
    global.server.close((err) => {
      if (err) {
        console.error('Error closing HTTP server:', err);
        return process.exit(1);
      }
      
      console.log('HTTP server closed successfully');
      
      // Close database connection
      mongoose.connection.close(false, (err) => {
        if (err) {
          console.error('Error closing MongoDB connection:', err);
          return process.exit(1);
        }
        
        console.log('MongoDB connection closed successfully');
        console.log('Graceful shutdown completed');
        process.exit(0);
      });
    });
    
    // Force close after 30 seconds
    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 30000);
  } else {
    process.exit(0);
  }
};

// Listen for shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// MongoDB connection and server startup
const startServer = async () => {
  try {
    // MongoDB connection
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      // Connection options for better performance and reliability
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      
      bufferCommands: false, // Disable mongoose buffering
    });
    
    console.log("✅ MongoDB connected successfully");
    console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);
    
    // Start HTTP server
    const PORT = process.env.PORT || 10000;
    const server = app.listen(PORT, () => {
      console.log(`🚀 MarketZone API Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`📊 API Health check: http://localhost:${PORT}/api/health`);
      console.log(`🌐 Frontend: https://www.imarketzone.ge`);
      console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`⚡ Slug endpoint: http://localhost:${PORT}/api/products/by-slug/[slug]`);
      console.log(`🎯 Ready to accept requests!`);
    });
    
    // Keep server reference for graceful shutdown
    global.server = server;
    
    // Server error handling
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
        process.exit(1);
      } else {
        console.error('❌ Server error:', error);
        process.exit(1);
      }
    });
    
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

// Start the server
startServer();