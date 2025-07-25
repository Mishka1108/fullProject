// routes/auth.js
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// Auth routes
router.post("/register", authController.register);
router.get("/verify/:token", authController.verifyEmail);
router.post("/login", authController.login);
router.post("/resend-verification", authController.resendVerification);

// Password reset routes
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password/:token", authController.resetPassword);
router.get("/verify-reset-token/:token", authController.verifyResetToken);

module.exports = router;