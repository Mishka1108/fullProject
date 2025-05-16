// generateAdminToken.js
const jwt = require("jsonwebtoken");

const adminToken = jwt.sign(
  { role: "admin" },
  "your_admin_jwt_secret_key_should_be_different", // იგივე რაც .env-ში გაქვს
  { expiresIn: "7d" }
);

console.log("Your admin token:");
console.log(adminToken);
