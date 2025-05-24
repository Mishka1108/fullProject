const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");

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
app.use("/api/auth", require("./routes/auth")); // User auth
app.use("/api/admin", require("./routes/admin")); // Admin ფუნქციები
app.use("/api/users", require("./routes/user")); // ჩვეულებრივი მომხმარებლები - ეს იყო მთავარი პრობლემა
app.use("/api/products", require("./routes/product"));
app.use("/api/contact", require("./routes/contactRoutes"));

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