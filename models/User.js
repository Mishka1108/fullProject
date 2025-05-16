//moduls/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  secondName: String,
  phone: Number,
  personalNumber: Number,
  dateOfBirth: Date,
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  profileImage: {
    type: String,
    default: "https://i.ibb.co/GvshXkLK/307ce493-b254-4b2d-8ba4-d12c080d6651.jpg"
  }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
