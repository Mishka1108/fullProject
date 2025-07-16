// middleware/auth.js - გამოსწორებული ვერსია

const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  console.log('verifyToken middleware called');
  console.log('Headers:', req.headers);
  
  const authHeader = req.header("Authorization");
  
  if (!authHeader) {
    console.log('No authorization header found');
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  const token = authHeader.startsWith("Bearer ") 
    ? authHeader.split(" ")[1] 
    : authHeader;

  if (!token) {
    console.log('No token found in authorization header');
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  try {
    console.log('Verifying token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token verified successfully:', decoded);
    
    req.user = decoded.user || decoded;
    
    // დავრწმუნდეთ, რომ user.id არსებობს
    if (!req.user.id) {
      console.log('No user ID found in token');
      return res.status(401).json({ message: "Invalid token format" });
    }
    
    console.log('User authenticated:', req.user.id);
    next();
  } catch (err) {
    console.error("Token verification error:", err);
    res.status(401).json({ message: "Token is not valid" });
  }
};

module.exports = { verifyToken };