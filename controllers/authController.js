//controllers/authController.js
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail");

exports.register = async (req, res) => {
  // ვიღებთ ყველა ველს მოთხოვნიდან
  const { name, email, password, secondName, phone, dateOfBirth, personalNumber } = req.body;
  
  console.log("Registration request body:", req.body); // დებაგისთვის

  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // შევქმნათ მომხმარებელი ყველა მიღებული მონაცემით
    user = await User.create({ 
      name, 
      email, 
      password: hashedPassword,
      secondName,
      phone,
      dateOfBirth,
      personalNumber
    });

    const emailToken = jwt.sign({ id: user._id }, process.env.EMAIL_SECRET, { expiresIn: "1d" });

    const url = `${process.env.BASE_URL}/api/auth/verify/${emailToken}`;
    await sendEmail(email, "Verify your email", `Click here to verify: ${url}`);

    res.status(201).json({ message: "User registered. Check your email for verification." });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    const decoded = jwt.verify(token, process.env.EMAIL_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) return res.status(400).json({ message: "Invalid token" });
    if (user.isVerified) return res.status(400).json({ message: "User already verified" });

    user.isVerified = true;
    await user.save();

    res.status(200).json({ message: "Email verified successfully" });
  } catch (err) {
    res.status(400).json({ message: "Invalid or expired token" });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    if (!user.isVerified) {
      return res.status(401).json({ message: "Please verify your email before logging in." });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    // დავაბრუნოთ მეტი ინფორმაცია მომხმარებლის შესახებ
    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        secondName: user.secondName,
        phone: user.phone,
        personalNumber: user.personalNumber,
        dateOfBirth: user.dateOfBirth,
        isVerified: user.isVerified
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};