//routes/user.js
const express = require('express');
const router = express.Router();
const { updateProfileImage, getCurrentUser } = require('../controllers/userController');
const { verifyToken } = require('../middleware/auth');
const parser = require('../models/upload');

// Apply multer middleware before controller function
router.put("/profile-image", verifyToken, parser.single('profileImage'), updateProfileImage);

// Add a new route to get current user data
router.get("/me", verifyToken, getCurrentUser);

module.exports = router;