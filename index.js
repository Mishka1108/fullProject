// ============================================
// 📁 index.js - MarketZone Backend Server
// ============================================
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIO = require('socket.io');

// Load environment variables
dotenv.config();

// Initialize Express app and HTTP server
const app = express();
const server = http.createServer(app);

// ============================================
// SOCKET.IO CONFIGURATION
// ============================================
const io = socketIO(server, {
  cors: {
    origin: [
      'https://market-zone.netlify.app',
      'https://imarketzone.ge',
      'https://www.imarketzone.ge',
      'http://localhost:4200',
      'http://localhost:3000',
      'http://localhost:8080',
      process.env.CLIENT_URL
    ].filter(Boolean),
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Make Socket.IO accessible to routes
app.set('io', io);

// ============================================
// MONGOOSE CONFIGURATION
// ============================================
mongoose.set('strictQuery', true);

// ============================================
// CORS CONFIGURATION
// ============================================
app.use(cors({
  origin: [
    'https://market-zone.netlify.app',
    'https://imarketzone.ge',        // ✅ www-ს გარეშე
    'https://www.imarketzone.ge',    // ✅ www-თი
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
  maxAge: 86400 // 24 hours
}));

// ============================================
// BODY PARSER MIDDLEWARE
// ============================================
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

// ============================================
// SECURITY HEADERS
// ============================================
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// ============================================
// REQUEST LOGGING (Development Only)
// ============================================
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
    if (req.body && Object.keys(req.body).length > 0) {
      console.log('Body:', JSON.stringify(req.body, null, 2));
    }
    next();
  });
}

// ============================================
// RATE LIMITING (Production Only)
// ============================================
if (process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    }
  });
  
  // Apply rate limiting to all API routes
  app.use('/api/', limiter);
  
  // Stricter rate limiting for auth routes
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: {
      error: 'Too many authentication attempts, please try again later.',
      retryAfter: '15 minutes'
    }
  });
  
  app.use('/api/auth/', authLimiter);
}

// ============================================
// SOCKET.IO CONNECTION HANDLER
// ============================================
const connectedUsers = new Map(); // userId -> socketId mapping

io.on('connection', (socket) => {
  console.log('🔌 New socket connection:', socket.id);

  // User joins with their userId
  socket.on('user:join', (userId) => {
    if (userId) {
      // Remove old socket if user already connected
      const oldSocketId = connectedUsers.get(userId);
      if (oldSocketId && oldSocketId !== socket.id) {
        io.sockets.sockets.get(oldSocketId)?.disconnect(true);
      }
      
      connectedUsers.set(userId, socket.id);
      socket.userId = userId;
      console.log(`✅ User ${userId} connected with socket ${socket.id}`);
      console.log(`👥 Total connected users: ${connectedUsers.size}`);
      
      // Notify user is online
      socket.broadcast.emit('user:online', { userId });
    }
  });

  // Handle typing indicator
  socket.on('typing:start', ({ userId, receiverId }) => {
    const receiverSocketId = connectedUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('typing:start', { userId });
    }
  });

  socket.on('typing:stop', ({ userId, receiverId }) => {
    const receiverSocketId = connectedUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('typing:stop', { userId });
    }
  });

  // Handle new message notification
  socket.on('message:send', ({ senderId, receiverId, message }) => {
    const receiverSocketId = connectedUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('message:received', {
        senderId,
        message
      });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    if (socket.userId) {
      connectedUsers.delete(socket.userId);
      console.log(`❌ User ${socket.userId} disconnected`);
      console.log(`👥 Total connected users: ${connectedUsers.size}`);
      
      // Notify user is offline
      socket.broadcast.emit('user:offline', { userId: socket.userId });
    } else {
      console.log('❌ Socket disconnected:', socket.id);
    }
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error('🔴 Socket error:', error);
  });
});

// Make connectedUsers accessible to routes
app.set('connectedUsers', connectedUsers);

// ============================================
// HEALTH CHECK ENDPOINTS
// ============================================
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    service: 'MarketZone API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    connectedUsers: connectedUsers.size
  });
});

app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const dbStatusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  res.status(200).json({
    status: 'alive',
    database: {
      status: dbStatusMap[dbStatus],
      name: mongoose.connection.db?.databaseName || 'N/A'
    },
    timestamp: new Date().toISOString(),
    socketIO: {
      status: 'active',
      connectedUsers: connectedUsers.size
    },
    memory: {
      used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
      total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`
    }
  });
});

// ============================================
// ROOT ENDPOINT
// ============================================
app.get('/', (req, res) => {
  res.json({
    message: 'MarketZone API Server',
    version: '1.0.0',
    status: 'running',
    documentation: 'https://www.imarketzone.ge/api-docs',
    socketIO: {
      status: 'active',
      connectedUsers: connectedUsers.size
    },
    endpoints: {
      health: '/health',
      api_health: '/api/health',
      auth: '/api/auth',
      admin: '/api/admin',
      users: '/api/users',
      products: '/api/products',
      contact: '/api/contact',
      messages: '/api/messages'
    }
  });
});

// ============================================
// API ROUTES
// ============================================
app.use("/api/auth", require("./routes/auth"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/users", require("./routes/user"));
app.use("/api/products", require("./routes/product"));
app.use("/api/contact", require("./routes/contactRoutes"));
app.use("/api/messages", require("./routes/messageRoutes"));

// ============================================
// GLOBAL ERROR HANDLER
// ============================================
app.use((err, req, res, next) => {
  console.error('🔴 Global Error:', {
    error: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      messages: Object.values(err.errors).map(e => e.message)
    });
  }

  // Mongoose Duplicate Key Error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      error: 'Duplicate Field',
      message: `${field} უже существует`,
      field: field
    });
  }

  // Mongoose Cast Error (Invalid ID)
  if (err.name === 'CastError') {
    return res.status(404).json({
      success: false,
      error: 'Invalid ID Format',
      message: 'არასწორი ID ფორმატი'
    });
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid Token',
      message: 'არასწორი ტოკენი'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token Expired',
      message: 'ტოკენი ვადაგასულია',
      expiredAt: err.expiredAt
    });
  }

  // Multer File Upload Errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: 'File Too Large',
      message: 'ფაილის ზომა ძალიან დიდია'
    });
  }

  // Default Error
  res.status(err.status || 500).json({
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'რაღაც არასწორად წავიდა!' 
      : err.message
  });
});

// ============================================
// 404 HANDLER
// ============================================
app.use('*', (req, res) => {
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      error: 'Endpoint Not Found',
      message: `Endpoint ${req.originalUrl} ვერ მოიძებნა`,
      availableEndpoints: [
        '/api/auth',
        '/api/users', 
        '/api/products',
        '/api/messages',
        '/api/contact'
      ]
    });
  }

  res.status(200).json({
    message: 'MarketZone API Server',
    frontend: 'https://www.imarketzone.ge',
    documentation: 'https://www.imarketzone.ge/api-docs'
  });
});

// ============================================
// GRACEFUL SHUTDOWN HANDLER
// ============================================
const gracefulShutdown = (signal) => {
  console.log(`\n⚠️  ${signal} received: starting graceful shutdown...`);
  
  // Close Socket.IO connections
  io.close(() => {
    console.log('✅ Socket.IO connections closed');
  });
  
  if (global.server) {
    global.server.close((err) => {
      if (err) {
        console.error('❌ Error closing server:', err);
        process.exit(1);
      }
      
      console.log('✅ HTTP server closed');
      
      // Close MongoDB connection
      mongoose.connection.close(false, (err) => {
        if (err) {
          console.error('❌ Error closing MongoDB:', err);
          process.exit(1);
        }
        
        console.log('✅ MongoDB connection closed');
        console.log('✅ Graceful shutdown completed');
        process.exit(0);
      });
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      console.error('⚠️  Forced shutdown after timeout');
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
  console.error('💥 Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// ============================================
// MONGODB CONNECTION & SERVER STARTUP
// ============================================
const startServer = async () => {
  try {
    console.log('\n🔄 Starting MarketZone API Server...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Connect to MongoDB
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
    });
    
    console.log("✅ MongoDB connected successfully");
    console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);
    console.log(`🌍 MongoDB Host: ${mongoose.connection.host}\n`);
    
    // Start HTTP Server
    const PORT = process.env.PORT || 10000;
    global.server = server.listen(PORT, '0.0.0.0', () => {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`🚀 MarketZone API Server`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📡 Port:        ${PORT}`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔌 Socket.IO:   Active`);
      console.log(`📊 Health:      http://localhost:${PORT}/health`);
      console.log(`🌍 CORS:        Enabled`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`\n✅ Server ready to accept requests!\n`);
    });
    
    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${PORT} is already in use`);
        console.error('Please check if another instance is running or change the PORT in .env\n');
        process.exit(1);
      } else {
        console.error('❌ Server error:', error);
        process.exit(1);
      }
    });
    
  } catch (error) {
    console.error("\n❌ Failed to start server:");
    console.error(error.message);
    console.error('\nPlease check:');
    console.error('1. MongoDB connection string in .env');
    console.error('2. MongoDB server is running');
    console.error('3. Network connectivity\n');
    process.exit(1);
  }
};

// Start the server
startServer();