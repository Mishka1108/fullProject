//routes/admin.js
const express = require("express");
const router = express.Router();
const { registerAdmin, loginAdmin, getAdminProfile } = require("../controllers/adminController");
const { verifyAdminToken } = require("../middleware/adminAuth");

// ადმინის რეგისტრაცია - დაცული უნდა იყოს პროდაქშენში
router.post("/register", registerAdmin);

// ადმინის ავტორიზაცია
router.post("/login", loginAdmin);

// ადმინის პროფილის მიღება - მხოლოდ ავტორიზებული ადმინისთვის
router.get("/profile", verifyAdminToken, getAdminProfile);

module.exports = router;