// routes/auth.js
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// ============================================
// REGISTRATION & VERIFICATION ROUTES
// ============================================

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (local registration)
 * @access  Public
 */
router.post("/register", authController.register);

/**
 * @route   GET /api/auth/verify/:token
 * @desc    Verify user email with token
 * @access  Public
 */
router.get("/verify/:token", authController.verifyEmail);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend verification email
 * @access  Public
 */
router.post("/resend-verification", authController.resendVerification);

// ============================================
// LOGIN ROUTES
// ============================================

/**
 * @route   POST /api/auth/login
 * @desc    Login user with email and password
 * @access  Public
 */
router.post("/login", authController.login);

/**
 * @route   POST /api/auth/google
 * @desc    Login/Register with Google OAuth
 * @access  Public
 */
router.post("/google", authController.googleLogin);

// ============================================
// PASSWORD RESET ROUTES
// ============================================

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Send password reset email
 * @access  Public
 */
router.post("/forgot-password", authController.forgotPassword);

/**
 * @route   POST /api/auth/reset-password/:token
 * @desc    Reset password with token
 * @access  Public
 */
router.post("/reset-password/:token", authController.resetPassword);

/**
 * @route   GET /api/auth/verify-reset-token/:token
 * @desc    Verify if password reset token is valid
 * @access  Public
 */
router.get("/verify-reset-token/:token", authController.verifyResetToken);

module.exports = router;