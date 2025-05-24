//routes/user.js
const express = require('express');
const router = express.Router();
const { updateProfileImage, getCurrentUser, updateProfile } = require('../controllers/userController');
const { verifyToken } = require('../middleware/auth');
const parser = require('../models/upload');

// Apply multer middleware before controller function
router.put("/profile-image", verifyToken, parser.single('profileImage'), updateProfileImage);

// Get current user data
router.get("/me", verifyToken, getCurrentUser);

// NEW: Update user profile information (name, secondName, phone, personalNumber, dateOfBirth)
router.put("/profile", verifyToken, updateProfile);

module.exports = router;