//controllers/adminAuth.js
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

exports.verifyAdminToken = async (req, res, next) => {
  // ვიღებთ ტოკენს Authorization ჰედერიდან
  const token = req.header("Authorization")?.split(" ")[1];
  
  if (!token) {
    return res.status(401).json({ message: "ავტორიზაცია აუცილებელია" });
  }

  try {
    // ვამოწმებთ ტოკენის ვალიდურობას
    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
    
    // ვამოწმებთ რომ ეს ადმინი არსებობს მონაცემთა ბაზაში
    const admin = await Admin.findById(decoded.id);
    
    if (!admin) {
      return res.status(401).json({ message: "ადმინი ვერ მოიძებნა" });
    }
    
    // თუ როლი არის ადმინი
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: "წვდომა აკრძალულია. მხოლოდ ადმინისთვის" });
    }
    
    // ვუნახავთ ადმინის ინფორმაციას რექუესტში მომდევნო მიდლვეარებისთვის
    req.admin = decoded;
    next();
  } catch (error) {
    console.error("ადმინის ტოკენის ვერიფიკაციის შეცდომა:", error);
    res.status(401).json({ message: "არავალიდური ტოკენი" });
  }
};