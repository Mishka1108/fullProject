// 📁 routes/messageRoutes.js - ✅ FIXED
// ============================================
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth"); // ✅ Import auth middleware
const {
  getConversations,
  getConversation,
  sendMessage,
  getUnreadCount,
  markAsRead,
  deleteConversation
} = require("../controllers/messageController");

// ✅ Apply authentication to ALL routes
router.use(verifyToken);

// 📋 საუბრების სია
router.get("/conversations", getConversations);

// 💬 საუბრის ყველა მესიჯის წამოღება
router.get("/conversation/:userId/:otherId", getConversation);

// 📩 მესიჯის გაგზავნა
router.post("/send", sendMessage);

// 🔢 წაუკითხავი მესიჯების რაოდენობა
router.get("/unread-count/:userId", getUnreadCount);

// ✅ საუბრის ყველა მესიჯის წაკითხულად მონიშვნა
router.put("/mark-read/:userId/:otherId", markAsRead);

// 🗑️ საუბრის წაშლა
router.delete("/conversation/:conversationId", deleteConversation);

module.exports = router;
