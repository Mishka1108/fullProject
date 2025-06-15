const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();

// Express აპი
const app = express();

// Optional: გააქტიურე strictQuery
mongoose.set('strictQuery', true);

// Health check endpoint - ყველაზე ზედა უნდა იყოს
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'alive', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    service: 'MarketZone API'
  });
});

// Root endpoint - API info
app.get('/', (req, res) => {
  res.json({
    message: 'MarketZone API Server',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      admin: '/api/admin', 
      users: '/api/users',
      products: '/api/products',
      contact: '/api/contact'
    }
  });
});

// CORS კონფიგურაცია
app.use(cors({
  origin: [
    'https://market-zone.netlify.app',
    'https://www.imarketzone.ge',
    'http://localhost:4200', // Development-ისთვის
    process.env.CLIENT_URL
  ].filter(Boolean),
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Middleware-ები
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging (development-ისთვის)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
  });
}

// API Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/users", require("./routes/user"));
app.use("/api/products", require("./routes/product"));
app.use("/api/contact", require("./routes/contactRoutes"));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Something went wrong!', 
    ...(process.env.NODE_ENV !== 'production' && { details: err.message })
  });
});

// Handle 404 for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    error: 'API endpoint not found',
    path: req.path 
  });
});

// Handle all other routes - redirect to frontend
app.use('*', (req, res) => {
  res.status(200).json({
    message: 'This is the API server only',
    frontend: 'https://market-zone.netlify.app',
    api_docs: req.protocol + '://' + req.get('host') + '/'
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  if (global.server) {
    global.server.close(() => {
      console.log('HTTP server closed');
      mongoose.connection.close(false, () => {
        console.log('MongoDB connection closed');
        process.exit(0);
      });
    });
  }
});

// MongoDB კავშირი და სერვერის გაშვება
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => {
      console.log(`🚀 API Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🌐 Frontend: https://www.imarketzone.ge`);
    });

    // Keep server reference for graceful shutdown
    global.server = server;
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });