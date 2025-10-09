// ============================================
// 📁 index.js - UPDATED VERSION
// ============================================
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();
mongoose.set('strictQuery', true);

// ✅ CORS Configuration
app.use(cors({
  origin: [
    'https://market-zone.netlify.app',
    'https://www.imarketzone.ge',
    'http://localhost:4200',
    'http://localhost:3000',
    'http://localhost:8080',
    process.env.CLIENT_URL
  ].filter(Boolean),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  credentials: true,
  maxAge: 86400
}));

// ✅ Body Parser Middleware
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

// Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Request Logging (Development)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
    next();
  });
}

// Rate Limiting (Production)
if (process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
      error: 'Too many requests, please try again later.',
      retryAfter: '15 minutes'
    }
  });
  app.use('/api/', limiter);
}

// Health Check Endpoints
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'MarketZone API',
    version: '1.0.0'
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'alive',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Root Endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'MarketZone API Server',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      api_health: '/api/health',
      auth: '/api/auth',
      admin: '/api/admin',
      users: '/api/users',
      products: '/api/products',
      contact: '/api/contact',
      messages: '/api/messages'
    },
    documentation: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        verify: 'GET /api/auth/verify'
      },
      products: {
        getAll: 'GET /api/products',
        getById: 'GET /api/products/:id',
        getBySlug: 'GET /api/products/by-slug/:slug',
        getUserProducts: 'GET /api/products/user (auth)',
        addProduct: 'POST /api/products (auth)',
        updateProduct: 'PUT /api/products/:id (auth)',
        deleteProduct: 'DELETE /api/products/:id (auth)'
      },
      messages: {
        sendMessage: 'POST /api/messages/send (auth)',
        getConversations: 'GET /api/messages/conversations (auth)',
        getConversation: 'GET /api/messages/conversation/:userId/:otherId (auth)',
        getUnreadCount: 'GET /api/messages/unread-count/:userId (auth)',
        markAsRead: 'PUT /api/messages/mark-read/:userId/:otherId (auth)',
        deleteConversation: 'DELETE /api/messages/conversation/:conversationId (auth)'
      }
    }
  });
});

// ✅ API Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/users", require("./routes/user"));
app.use("/api/products", require("./routes/product"));
app.use("/api/contact", require("./routes/contactRoutes"));
app.use("/api/messages", require("./routes/messageRoutes")); // ✅ Messages Routes

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Global Error:', {
    error: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method
  });

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      messages: Object.values(err.errors).map(e => e.message)
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      error: 'Duplicate Field',
      message: `${field} already exists`
    });
  }

  if (err.name === 'CastError') {
    return res.status(404).json({
      success: false,
      error: 'Invalid ID Format'
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid Token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token Expired'
    });
  }

  res.status(err.status || 500).json({
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong!' 
      : err.message
  });
});

// 404 Handler for API
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found',
    path: req.originalUrl
  });
});

// 404 Handler for All Other Routes
app.use('*', (req, res) => {
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      error: 'Endpoint not found'
    });
  }

  res.status(200).json({
    message: 'MarketZone API Server',
    frontend: 'https://www.imarketzone.ge',
    api_docs: req.protocol + '://' + req.get('host') + '/'
  });
});

// Graceful Shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received: starting graceful shutdown`);
  
  if (global.server) {
    global.server.close((err) => {
      if (err) {
        console.error('Error closing server:', err);
        process.exit(1);
      }
      
      mongoose.connection.close(false, (err) => {
        if (err) {
          console.error('Error closing MongoDB:', err);
          process.exit(1);
        }
        
        console.log('Graceful shutdown completed');
        process.exit(0);
      });
    });

    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// MongoDB Connection and Server Startup
const startServer = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
    });
    
    console.log("✅ MongoDB connected successfully");
    console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);
    
    const PORT = process.env.PORT || 10000;
    const server = app.listen(PORT, () => {
      console.log(`\n🚀 MarketZone API Server`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📡 Port: ${PORT}`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📊 Health: http://localhost:${PORT}/health`);
      console.log(`📱 API Docs: http://localhost:${PORT}/`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`\n✅ Available Endpoints:`);
      console.log(`   🔐 Auth:     /api/auth`);
      console.log(`   👥 Users:    /api/users`);
      console.log(`   📦 Products: /api/products`);
      console.log(`   💬 Messages: /api/messages`);
      console.log(`   📧 Contact:  /api/contact`);
      console.log(`   👑 Admin:    /api/admin`);
      console.log(`\n🎯 Ready to accept requests!\n`);
    });
    
    global.server = server;
    
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