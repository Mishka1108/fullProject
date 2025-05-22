const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

// დაცული POST API admin token-ის გენერაციისთვის
router.post("/", (req, res) => {
  const { secretCode } = req.body;

  // .env-ში უნდა გქონდეს ეს პარამეტრი
  if (secretCode !== process.env.ADMIN_SECRET_CODE) {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    const token = jwt.sign(
      { role: "admin" },
      process.env.ADMIN_JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: "Token generation failed", error });
  }
});

module.exports = router;
