// middleware/adminAuth.js
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

module.exports = async (req, res, next) => {
  try {
    // ტოკენის მიღება ჰედერიდან
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }
    
    // ტოკენის ვერიფიკაცია
    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
    
    // ადმინის მოძებნა
    const admin = await Admin.findById(decoded.id).select('-password');
    
    if (!admin) {
      return res.status(401).json({ message: 'Token is not valid or admin not found' });
    }
    
    // მოთხოვნაში ადმინის ინფორმაციის დამატება
    req.admin = {
      id: admin._id,
      role: admin.role
    };
    
    next();
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};