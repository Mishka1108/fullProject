const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sendEmail = require('../utils/sendEmail');

/**
 * Register a new user
 * @route POST /api/auth/register
 */
const register = async (req, res) => {
  console.log("=== REGISTRATION START ===");
  console.log("Request body:", req.body);
  
  try {
    const { name, secondName, email, password, phone, personalNumber, dateOfBirth } = req.body;

    console.log("Step 1: Validation started");
    
    // Required fields validation
    if (!name || !secondName || !email || !password) {
      console.log("Validation failed: Missing required fields");
      return res.status(400).json({ 
        message: "სახელი, გვარი, ელ-ფოსტა და პაროლი სავალდებულოა" 
      });
    }

    console.log("Step 2: Checking existing user");
    
    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      console.log("User already exists with email:", email);
      return res.status(400).json({ message: "ამ ელ-ფოსტით უკვე არსებობს მომხმარებელი" });
    }

    console.log("Step 3: Additional validations");
    
    // Check if phone number already exists (if provided)
    if (phone) {
      const phoneExists = await User.findOne({ phone });
      if (phoneExists) {
        return res.status(400).json({ message: "ეს ტელეფონის ნომერი უკვე გამოყენებულია" });
      }
    }

    // Check if personal number already exists (if provided)
    if (personalNumber) {
      const personalNumExists = await User.findOne({ personalNumber });
      if (personalNumExists) {
        return res.status(400).json({ message: "ეს პირადი ნომერი უკვე გამოყენებულია" });
      }
    }

    // Additional validations
    if (phone && !/^\+?[0-9]{9,15}$/.test(phone.toString())) {
      return res.status(400).json({ message: "ტელეფონის ნომერი არასწორია" });
    }

    if (personalNumber && !/^[0-9]{11}$/.test(personalNumber.toString())) {
      return res.status(400).json({ message: "პირადი ნომერი უნდა შედგებოდეს 11 ციფრისგან" });
    }

    if (dateOfBirth) {
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      
      if (birthDate > today) {
        return res.status(400).json({ message: "დაბადების თარიღი არ შეიძლება იყოს მომავალში" });
      } else if (age < 13) {
        return res.status(400).json({ message: "ასაკი უნდა იყოს მინიმუმ 13 წელი" });
      }
    }

    console.log("Step 4: Creating user data");
    
    // Create user data object
    const userData = {
      name: name.trim(),
      secondName: secondName.trim(),
      email: email.trim().toLowerCase(),
      password
    };

    // Add optional fields if provided
    if (phone) userData.phone = phone;
    if (personalNumber) userData.personalNumber = personalNumber;
    if (dateOfBirth) userData.dateOfBirth = new Date(dateOfBirth);

    console.log("Step 5: Creating new user instance");
    
    // Create new user
    user = new User(userData);

    console.log("Step 6: Hashing password");
    
    // Hash password before saving
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    console.log("Step 7: Saving user to database");
    
    await user.save();
    
    console.log("Step 8: User saved successfully, ID:", user._id);

    // Create email verification token
    const emailToken = jwt.sign(
      { id: user._id },
      process.env.EMAIL_SECRET,
      { expiresIn: '1d' }
    );

    console.log("Step 9: Email token created");

    // Email verification enabled
    try {
      // Verification URL
      const verificationUrl = `${process.env.BASE_URL}/api/auth/verify/${emailToken}`;

      // Send verification email
      await sendEmail(
        email,
        "ელფოსტის ვერიფიკაცია",
        verificationUrl // URL იგზავნება როგორც message
      );

      console.log("Step 10: Verification email sent successfully");

      res.status(201).json({ 
        message: "მომხმარებელი წარმატებით დარეგისტრირდა. გთხოვთ შეამოწმოთ თქვენი ელფოსტა ვერიფიკაციის ბმულისთვის.",
        userId: user._id
      });

    } catch (emailError) {
      console.error("Error sending verification email:", emailError);
      
      // If email fails, still return success but with different message
      res.status(201).json({ 
        message: "მომხმარებელი წარმატებით დარეგისტრირდა, მაგრამ ვერიფიკაციის ელფოსტა ვერ გაიგზავნა. გთხოვთ სცადოთ ხელახლა ან დაუკავშირდით მხარდაჭერას.",
        userId: user._id,
        emailError: true
      });
    }
    
  } catch (err) {
    console.error("=== REGISTRATION ERROR ===");
    console.error("Error message:", err.message);
    console.error("Error stack:", err.stack);
    console.error("Error name:", err.name);
    console.error("Error code:", err.code);
    
    // Handle MongoDB validation errors
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({
        message: 'ვალიდაციის შეცდომა',
        errors: messages
      });
    }
    
    // Handle duplicate key errors
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      let message = 'ამ მონაცემებით უკვე არსებობს მომხმარებელი';
      
      if (field === 'email') {
        message = 'ამ ელ-ფოსტით უკვე არსებობს მომხმარებელი';
      } else if (field === 'phone') {
        message = 'ეს ტელეფონის ნომერი უკვე გამოყენებულია';
      } else if (field === 'personalNumber') {
        message = 'ეს პირადი ნომერი უკვე გამოყენებულია';
      }
      
      return res.status(400).json({ message });
    }
    
    res.status(500).json({ message: "სერვერის შეცდომა", error: err.message });
  }
};

/**
 * Resend verification email
 * @route POST /api/auth/resend-verification
 */
const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "ელ-ფოსტა სავალდებულოა" });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(400).json({ message: "მომხმარებელი ვერ მოიძებნა" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "ელ-ფოსტა უკვე ვერიფიცირებულია" });
    }

    // Create new verification token
    const emailToken = jwt.sign(
      { id: user._id },
      process.env.EMAIL_SECRET,
      { expiresIn: '1d' }
    );

    // Verification URL
    const verificationUrl = `${process.env.BASE_URL}/api/auth/verify/${emailToken}`;

    // Send verification email
    await sendEmail(
      email,
      "ელფოსტის ვერიფიკაცია",
      verificationUrl
    );

    res.json({ message: "ვერიფიკაციის ელფოსტა ხელახლა გაიგზავნა" });

  } catch (err) {
    console.error("Error resending verification:", err);
    res.status(500).json({ message: "სერვერის შეცდომა" });
  }
};

/**
 * Verify user email with token
 * @route GET /api/auth/verify/:token
 */
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    const decoded = jwt.verify(token, process.env.EMAIL_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) return res.status(400).json({ message: "Invalid token" });
    if (user.isVerified) return res.status(400).json({ message: "User already verified" });

    user.isVerified = true;
    await user.save();

    // HTML response for successful verification
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 40px;
            background: #f7f7f7;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .success-icon {
            color: #4caf50;
            font-size: 64px;
            margin-bottom: 20px;
          }
          h1 {
            color: #333;
          }
          p {
            color: #666;
            margin-bottom: 20px;
          }
          .button {
            display: inline-block;
            background-color: #4285f4;
            color: white;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 4px;
            font-weight: bold;
          }
          .redirect-message {
            margin-top: 20px;
            font-size: 14px;
            color: #999;
          }
        </style>
        <script>
          setTimeout(function() {
            window.location.href = "${process.env.CLIENT_URL}/auth/login";
          }, 3000);
        </script>
      </head>
      <body>
        <div class="container">
          <div class="success-icon">✓</div>
          <h1>ელ-ფოსტა წარმატებით დადასტურდა!</h1>
          <p>თქვენი ანგარიში ახლა აქტიურია და შეგიძლიათ შესვლა.</p>
          <a href="${process.env.CLIENT_URL}/auth/login" class="button">შესვლაზე გადასვლა</a>
          <p class="redirect-message">3 წამში ავტომატურად გადაგიყვანთ...</p>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    console.error("Error verifying email:", err);
    res.status(400).send(`Error verifying email`);
  }
};

/**
 * Login user
 * @route POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(400).json({ message: "არასწორი ელ-ფოსტა ან პაროლი" });
    }

    // Check if user is verified
    if (!user.isVerified) {
      return res.status(400).json({ 
        message: "გთხოვთ დაადასტუროთ თქვენი ელ-ფოსტა შესვლამდე",
        needsVerification: true,
        email: user.email
      });
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "არასწორი ელ-ფოსტა ან პაროლი" });
    }

    // Create and return JWT token
    const payload = {
      user: {
        id: user.id
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1d' },
      (err, token) => {
        if (err) throw err;
        res.json({ 
          token,
          user: {
            id: user.id,
            name: user.name,
            secondName: user.secondName,
            email: user.email,
            phone: user.phone,
            personalNumber: user.personalNumber,
            dateOfBirth: user.dateOfBirth,
            isVerified: user.isVerified,
            profileImage: user.profileImage
          }
        });
      }
    );
  } catch (err) {
    console.error("Error logging in:", err);
    res.status(500).json({ message: "სერვერის შეცდომა" });
  }
};

// PROPER EXPORTS
module.exports = {
  register,
  verifyEmail,
  login,
  resendVerification
};