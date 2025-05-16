//controllers/adminController.js
const Admin = require("../models/Admin");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ადმინის რეგისტრაცია (ეს ფუნქცია შეიძლება შეზღუდული იყოს წვდომით ან მხოლოდ სერვერში იყოს გამოყენებული)
exports.registerAdmin = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // შევამოწმოთ არის თუ არა ადმინი ამ username-ით ან email-ით
    let admin = await Admin.findOne({ $or: [{ username }, { email }] });
    if (admin) {
      return res.status(400).json({ message: "ადმინი უკვე არსებობს" });
    }

    // პაროლის დაჰეშვა
    const hashedPassword = await bcrypt.hash(password, 10);

    // ახალი ადმინის შექმნა
    admin = new Admin({
      username,
      email,
      password: hashedPassword
    });

    await admin.save();

    // JWT ტოკენის შექმნა
    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.ADMIN_JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "ადმინი წარმატებით დარეგისტრირდა",
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    console.error("ადმინის რეგისტრაციის შეცდომა:", error);
    res.status(500).json({ message: "სერვერის შეცდომა" });
  }
};

// ადმინის ავტორიზაცია
exports.loginAdmin = async (req, res) => {
  const { username, password } = req.body;

  try {
    // მოვძებნოთ ადმინი username-ით
    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(400).json({ message: "არასწორი მომხმარებლის სახელი ან პაროლი" });
    }

    // შევამოწმოთ პაროლი
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: "არასწორი მომხმარებლის სახელი ან პაროლი" });
    }

    // JWT ტოკენის შექმნა
    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.ADMIN_JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      message: "ავტორიზაცია წარმატებულია",
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    console.error("ადმინის ავტორიზაციის შეცდომა:", error);
    res.status(500).json({ message: "სერვერის შეცდომა" });
  }
};

// ადმინის პროფილის მიღება
exports.getAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id).select("-password");
    if (!admin) {
      return res.status(404).json({ message: "ადმინი ვერ მოიძებნა" });
    }
    res.status(200).json(admin);
  } catch (error) {
    console.error("ადმინის პროფილის მიღების შეცდომა:", error);
    res.status(500).json({ message: "სერვერის შეცდომა" });
  }
};