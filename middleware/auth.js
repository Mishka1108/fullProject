
// ============================================
const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  console.log('\n🔐 === AUTH MIDDLEWARE ===');
  console.log('📍 Path:', req.path);
  console.log('🔑 Headers:', {
    authorization: req.headers.authorization ? 'EXISTS' : 'MISSING',
    contentType: req.headers['content-type']
  });

  try {
    // 1. წამოიღე Authorization header
    const authHeader = req.headers.authorization || req.header("Authorization");
    
    if (!authHeader) {
      console.log('❌ No Authorization header');
      return res.status(401).json({ 
        success: false,
        message: "No authorization header provided" 
      });
    }

    console.log('✅ Auth header found:', authHeader.substring(0, 30) + '...');

    // 2. გამოყავი token "Bearer TOKEN" ფორმატიდან
    let token;
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else if (authHeader.startsWith("bearer ")) {
      token = authHeader.substring(7);
    } else {
      token = authHeader;
    }

    if (!token || token === '' || token === 'null' || token === 'undefined') {
      console.log('❌ Invalid token format');
      return res.status(401).json({ 
        success: false,
        message: "Invalid token format" 
      });
    }

    console.log('✅ Token extracted, length:', token.length);

    // 3. გაშიფრე JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token decoded:', {
      userId: decoded.id || decoded._id || decoded.userId || decoded.user?.id,
      email: decoded.email || decoded.user?.email,
      exp: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : 'N/A'
    });

    // 4. მიამაგრე user info-ს request-ს
    // სხვადასხვა ფორმატების მხარდაჭერა
    if (decoded.user) {
      // თუ token ფორმატი: { user: { id, email, ... } }
      req.user = decoded.user;
      req.userId = decoded.user.id || decoded.user._id;
    } else {
      // თუ token ფორმატი: { id, email, ... }
      req.user = {
        id: decoded.id || decoded._id || decoded.userId,
        email: decoded.email,
        role: decoded.role
      };
      req.userId = decoded.id || decoded._id || decoded.userId;
    }

    if (!req.userId) {
      console.log('❌ No user ID in token');
      return res.status(401).json({ 
        success: false,
        message: "Invalid token: no user ID" 
      });
    }

    console.log('✅ User authenticated:', req.userId);
    next();

  } catch (error) {
    console.error('❌ Auth error:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: "Token has expired",
        expiredAt: error.expiredAt
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
        error: error.message
      });
    }
    
    return res.status(401).json({
      success: false,
      message: "Authentication failed",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Optional - auth middleware რომელიც არ აბლოკავს request-ს
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.header("Authorization");
    
    if (authHeader) {
      let token = authHeader.startsWith("Bearer ") 
        ? authHeader.substring(7) 
        : authHeader;
      
      if (token && token !== 'null' && token !== 'undefined') {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (decoded.user) {
          req.user = decoded.user;
          req.userId = decoded.user.id || decoded.user._id;
        } else {
          req.user = decoded;
          req.userId = decoded.id || decoded._id || decoded.userId;
        }
      }
    }
    
    next();
  } catch (error) {
    // არ დააბრუნოს error-ი, უბრალოდ გააგრძელოს
    next();
  }
};

module.exports = { verifyToken, optionalAuth };


// ============================================