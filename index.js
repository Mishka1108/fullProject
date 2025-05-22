const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");

const adminRoutes = require('./routes/admin');

dotenv.config();

// Express აპი
const app = express();

// Optional: გააქტიურე strictQuery (ზოგჯერ საჭირო ხდება Mongoose 7+ ვერსიებზე)
mongoose.set('strictQuery', true);

// CORS კონფიგურაცია
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:4200',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Middleware-ები
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/admin", require("./routes/user.js")); // Admin რეგისტრაცია
app.use("/api/admin-auth", require("./routes/admin")); // Admin ავტორიზაცია
app.use("/api/users", require("./routes/user"));
app.use("/api/products", require("./routes/product"));
app.use("/api/contact", require("./routes/contactRoutes"));
app.use("/api/generate-admin-token", require("./generateAdminToken")); // Admin Token გენერაცია
app.use("/api/admin", adminRoutes);

// Static files (production only)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('client/dist'));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'dist', 'index.html'));
  });
}

// MongoDB კავშირი და სერვერის გაშვება
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });
