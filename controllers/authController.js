const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

let sendEmailModule;
let sendEmail;
let sendVerificationEmail;
let sendPasswordResetEmail;

try {
  sendEmailModule = require('../utils/sendEmail2');
  console.log('sendEmailModule imported successfully:', Object.keys(sendEmailModule));
  
  sendEmail = sendEmailModule.sendEmail;
  sendVerificationEmail = sendEmailModule.sendVerificationEmail;
  sendPasswordResetEmail = sendEmailModule.sendPasswordResetEmail;
  
  console.log('sendEmail function type:', typeof sendEmail);
  console.log('sendVerificationEmail function type:', typeof sendVerificationEmail);
  console.log('sendPasswordResetEmail function type:', typeof sendPasswordResetEmail);
  
} catch (error) {
  console.error('Failed to import sendEmail module:', error.message);
  sendEmailModule = null;
  sendEmail = null;
  sendVerificationEmail = null;
  sendPasswordResetEmail = null;
}

const register = async (req, res) => {
  console.log("=== REGISTRATION START ===");
  console.log("Request body:", req.body);
  
  try {
    const { name, secondName, email, password, phone, personalNumber, dateOfBirth } = req.body;

    console.log("Step 1: Validation started");
    
    if (!name || !secondName || !email || !password) {
      console.log("Validation failed: Missing required fields");
      return res.status(400).json({ 
        message: "სახელი, გვარი, ელ-ფოსტა და პაროლი სავალდებულოა" 
      });
    }

    console.log("Step 2: Checking existing user");
    
    let user = await User.findOne({ email });
    if (user) {
      console.log("User already exists with email:", email);
      return res.status(400).json({ message: "ამ ელ-ფოსტით უკვე არსებობს მომხმარებელი" });
    }

    console.log("Step 3: Additional validations");
    
    if (phone) {
      const phoneExists = await User.findOne({ phone });
      if (phoneExists) {
        return res.status(400).json({ message: "ეს ტელეფონის ნომერი უკვე გამოყენებულია" });
      }
    }

    if (personalNumber) {
      const personalNumExists = await User.findOne({ personalNumber });
      if (personalNumExists) {
        return res.status(400).json({ message: "ეს პირადი ნომერი უკვე გამოყენებულია" });
      }
    }

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
    
    const userData = {
      name: name.trim(),
      secondName: secondName.trim(),
      email: email.trim().toLowerCase(),
      password
    };

    if (phone) userData.phone = phone;
    if (personalNumber) userData.personalNumber = personalNumber;
    if (dateOfBirth) userData.dateOfBirth = new Date(dateOfBirth);

    console.log("Step 5: Creating new user instance");
    
    user = new User(userData);

    console.log("Step 6: Hashing password");
    
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    console.log("Step 7: Saving user to database");
    
    await user.save();
    
    console.log("Step 8: User saved successfully, ID:", user._id);

    const emailToken = jwt.sign(
      { id: user._id },
      process.env.EMAIL_SECRET,
      { expiresIn: '1d' }
    );

    console.log("Step 9: Email token created");

    console.log("Environment variables check:");
    console.log("EMAIL_USER:", process.env.EMAIL_USER ? "SET" : "NOT SET");
    console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? "SET" : "NOT SET");
    console.log("BASE_URL:", process.env.BASE_URL ? "SET" : "NOT SET");

    console.log("Checking sendEmail availability:");
    console.log("sendEmailModule exists:", !!sendEmailModule);
    console.log("sendVerificationEmail exists:", !!sendVerificationEmail);
    console.log("sendVerificationEmail type:", typeof sendVerificationEmail);
    
    if (sendVerificationEmail && typeof sendVerificationEmail === 'function') {
      try {
        console.log("Attempting to send verification email...");
        
        const verificationUrl = `${process.env.BASE_URL}/api/auth/verify/${emailToken}`;
        console.log("Verification URL:", verificationUrl);

        const result = await sendVerificationEmail(
          email,
          "ანგარიშის გააქტიურება",
          verificationUrl
        );

        console.log("Step 10: Verification email sent successfully");
        console.log("Email result:", result);

        res.status(201).json({ 
          message: "მომხმარებელი წარმატებით დარეგისტრირდა. გთხოვთ შეამოწმოთ თქვენი ელფოსტა გააქტიურების ბმულისთვის.",
          userId: user._id,
          emailSent: true
        });

      } catch (emailError) {
        console.error("Error sending verification email:", emailError);
        console.error("Email error stack:", emailError.stack);
        
        res.status(201).json({ 
          message: "მომხმარებელი წარმატებით დარეგისტრირდა, მაგრამ გააქტიურების ელფოსტა ვერ გაიგზავნა. შეცდომა: " + emailError.message,
          userId: user._id,
          emailError: true,
          emailErrorMessage: emailError.message
        });
      }
    } else {
      console.error("sendVerificationEmail function is not available");
      console.error("Available functions:", sendEmailModule ? Object.keys(sendEmailModule) : 'Module not loaded');
      
      res.status(201).json({ 
        message: "მომხმარებელი წარმატებით დარეგისტრირდა, მაგრამ ელფოსტის სერვისი ამჟამად მიუწვდომელია.",
        userId: user._id,
        emailError: true,
        emailErrorMessage: "Email service not available"
      });
    }
    
  } catch (err) {
    console.error("=== REGISTRATION ERROR ===");
    console.error("Error message:", err.message);
    console.error("Error stack:", err.stack);
    console.error("Error name:", err.name);
    console.error("Error code:", err.code);
    
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({
        message: 'ვალიდაციის შეცდომა',
        errors: messages
      });
    }
    
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

const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "ელ-ფოსტა სავალდებულოა" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(400).json({ message: "მომხმარებელი ვერ მოიძებნა" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "ელ-ფოსტა უკვე ვერიფიცირებულია" });
    }

    if (!sendVerificationEmail || typeof sendVerificationEmail !== 'function') {
      return res.status(500).json({ message: "ელფოსტის სერვისი ამჟამად მიუწვდომელია" });
    }

    const emailToken = jwt.sign(
      { id: user._id },
      process.env.EMAIL_SECRET,
      { expiresIn: '1d' }
    );

    const verificationUrl = `${process.env.BASE_URL}/api/auth/verify/${emailToken}`;

    await sendVerificationEmail(
      email,
      "ანგარიშის გააქტიურება",
      verificationUrl
    );

    res.json({ message: "გააქტიურების ელფოსტა ხელახლა გაიგზავნა" });

  } catch (err) {
    console.error("Error resending verification:", err);
    res.status(500).json({ message: "სერვერის შეცდომა" });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    const decoded = jwt.verify(token, process.env.EMAIL_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) return res.status(400).json({ message: "Invalid token" });
    if (user.isVerified) return res.status(400).json({ message: "User already verified" });

    user.isVerified = true;
    await user.save();

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

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(400).json({ message: "არასწორი ელ-ფოსტა ან პაროლი" });
    }

    if (user.provider === 'google' && !user.password) {
      return res.status(400).json({ 
        message: "ეს ანგარიში Google-ით არის შექმნილი. გთხოვთ შეხვიდეთ Google-ის საშუალებით.",
        useGoogleLogin: true
      });
    }

    if (!user.isVerified) {
      return res.status(400).json({ 
        message: "გთხოვთ დაადასტუროთ თქვენი ელ-ფოსტა შესვლამდე",
        needsVerification: true,
        email: user.email
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "არასწორი ელ-ფოსტა ან პაროლი" });
    }

    const payload = {
      user: {
        id: user.id
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
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
            profileImage: user.profileImage,
            provider: user.provider
          }
        });
      }
    );
  } catch (err) {
    console.error("Error logging in:", err);
    res.status(500).json({ message: "სერვერის შეცდომა" });
  }
};

// ✅ UPDATED: Google Login with isNewUser flag
const googleLogin = async (req, res) => {
  console.log("=== GOOGLE LOGIN START ===");
  
  try {
    const { credential } = req.body;
    
    if (!credential) {
      return res.status(400).json({ message: "Google credential არ არის მოწოდებული" });
    }

    console.log("Step 1: Verifying Google token");

    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID
      });
    } catch (verifyError) {
      console.error("Google token verification failed:", verifyError);
      return res.status(401).json({ message: "Google authentication ვერ მოხერხდა" });
    }

    const payload = ticket.getPayload();
    console.log("Step 2: Google token verified, payload:", {
      email: payload.email,
      name: payload.name,
      verified: payload.email_verified
    });

    const {
      email,
      name,
      family_name,
      picture,
      sub: googleId,
      email_verified
    } = payload;

    if (!email_verified) {
      return res.status(400).json({ message: "Google ელ-ფოსტა არ არის ვერიფიცირებული" });
    }

    console.log("Step 3: Checking if user exists");

    let user = await User.findOne({ email: email.toLowerCase() });
    let isNewUser = false; // ✅ დავამატეთ ფლაგი

    if (user) {
      console.log("Step 4: User exists, logging in");

      if (!user.googleId) {
        user.googleId = googleId;
        user.provider = 'google';
        user.isVerified = true;
        if (!user.profileImage && picture) {
          user.profileImage = picture;
        }
        await user.save();
      }

    } else {
      console.log("Step 5: Creating new user from Google data");
      isNewUser = true; // ✅ ახალი მომხმარებელია

      user = new User({
        name: name || '',
        secondName: family_name || '',
        email: email.toLowerCase(),
        googleId: googleId,
        provider: 'google',
        isVerified: true,
        profileImage: picture || '',
        password: await bcrypt.hash(Math.random().toString(36), 10)
      });

      await user.save();
      console.log("Step 6: New user created successfully");
    }

    console.log("Step 7: Creating JWT token");

    const jwtPayload = {
      user: {
        id: user.id
      }
    };

    jwt.sign(
      jwtPayload,
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
      (err, token) => {
        if (err) {
          console.error("JWT creation error:", err);
          throw err;
        }

        console.log("Step 8: Login successful");

        res.json({
          success: true,
          token,
          isNewUser, // ✅ დავაბრუნეთ isNewUser ფლაგი
          user: {
            id: user.id,
            name: user.name,
            secondName: user.secondName,
            email: user.email,
            phone: user.phone,
            personalNumber: user.personalNumber,
            dateOfBirth: user.dateOfBirth,
            isVerified: user.isVerified,
            profileImage: user.profileImage,
            provider: user.provider
          }
        });
      }
    );

  } catch (err) {
    console.error("=== GOOGLE LOGIN ERROR ===");
    console.error("Error:", err);
    res.status(500).json({ 
      message: "სერვერის შეცდომა Google authentication-ის დროს",
      error: err.message 
    });
  }
};

const logout = async (req, res) => {
  console.log("=== LOGOUT START ===");
  console.log("User ID:", req.userId || req.user?.id);
  
  try {
    const userId = req.userId || req.user?.id;

    if (userId) {
      console.log(`✅ User ${userId} logged out successfully`);
    }

    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    console.log("✅ Logout successful");

    res.status(200).json({ 
      success: true,
      message: "Logout successful" 
    });

  } catch (err) {
    console.error("=== LOGOUT ERROR ===");
    console.error("Error:", err);
    res.status(500).json({ 
      success: false,
      message: "Logout failed",
      error: err.message 
    });
  }
};

const forgotPassword = async (req, res) => {
  console.log("=== FORGOT PASSWORD START ===");
  console.log("Request body:", req.body);
  
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "ელ-ფოსტა სავალდებულოა" });
    }

    console.log("Step 1: Looking for user with email:", email);

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (!user) {
      console.log("User not found with email:", email);
      return res.status(200).json({ 
        message: "თუ ეს ელ-ფოსტა რეგისტრირებულია სისტემაში, პაროლის აღდგენის ბმული გაიგზავნება" 
      });
    }

    console.log("Step 2: User found, ID:", user._id);

    if (!sendPasswordResetEmail || typeof sendPasswordResetEmail !== 'function') {
      console.error("sendPasswordResetEmail function is not available");
      return res.status(500).json({ message: "ელფოსტის სერვისი ამჟამად მიუწვდომელია" });
    }

    console.log("Step 3: Creating password reset token");

    const resetToken = jwt.sign(
      { 
        id: user._id,
        email: user.email,
        type: 'password_reset'
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log("Step 4: Password reset token created");

    const resetUrl = `${process.env.CLIENT_URL}/auth/reset-password/${resetToken}`;
    console.log("Reset URL:", resetUrl);

    try {
      console.log("Step 5: Sending password reset email");

      const result = await sendPasswordResetEmail(
        email,
        "პაროლის აღდგენა",
        resetUrl,
        user.name
      );

      console.log("Step 6: Password reset email sent successfully");
      console.log("Email result:", result);

      res.status(200).json({ 
        message: "პაროლის აღდგენის ბმული გაიგზავნა თქვენს ელ-ფოსტაზე. გთხოვთ შეამოწმოთ inbox და spam ფოლდერები.",
        emailSent: true
      });

    } catch (emailError) {
      console.error("Error sending password reset email:", emailError);
      console.error("Email error stack:", emailError.stack);
      
      res.status(500).json({ 
        message: "პაროლის აღდგენის ელფოსტა ვერ გაიგზავნა. გთხოვთ სცადოთ მოგვიანებით.",
        emailError: true,
        emailErrorMessage: emailError.message
      });
    }

  } catch (err) {
    console.error("=== FORGOT PASSWORD ERROR ===");
    console.error("Error message:", err.message);
    console.error("Error stack:", err.stack);
    
    res.status(500).json({ message: "სერვერის შეცდომა", error: err.message });
  }
};

const resetPassword = async (req, res) => {
  console.log("=== RESET PASSWORD START ===");
  console.log("Request params:", req.params);
  console.log("Request body:", req.body);
  
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    console.log("Step 1: Validating input");

    if (!password || !confirmPassword) {
      return res.status(400).json({ message: "პაროლი და პაროლის დადასტურება სავალდებულოა" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "პაროლები არ ემთხვევა" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "პაროლი უნდა შედგებოდეს მინიმუმ 6 სიმბოლოსგან" });
    }

    console.log("Step 2: Verifying reset token");

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Token decoded successfully:", decoded);
    } catch (tokenError) {
      console.error("Token verification error:", tokenError);
      return res.status(400).json({ 
        message: "პაროლის აღდგენის ბმული არასწორია ან ვადაგასულია",
        tokenExpired: true
      });
    }

    if (decoded.type !== 'password_reset') {
      console.log("Invalid token type:", decoded.type);
      return res.status(400).json({ message: "არასწორი ტოკენის ტიპი" });
    }

    console.log("Step 3: Finding user");

    const user = await User.findById(decoded.id);
    if (!user) {
      console.log("User not found with ID:", decoded.id);
      return res.status(400).json({ message: "მომხმარებელი ვერ მოიძებნა" });
    }

    console.log("Step 4: User found, updating password");

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user.password = hashedPassword;
    await user.save();

    console.log("Step 5: Password updated successfully");

    res.status(200).json({ 
      message: "პაროლი წარმატებით განახლდა. ახლა შეგიძლიათ ახალი პაროლით შესვლა.",
      success: true
    });

  } catch (err) {
    console.error("=== RESET PASSWORD ERROR ===");
    console.error("Error message:", err.message);
    console.error("Error stack:", err.stack);
    
    res.status(500).json({ message: "სერვერის შეცდომა", error: err.message });
  }
};

const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    console.log("Verifying reset token:", token);

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Token decoded successfully:", decoded);
    } catch (tokenError) {
      console.error("Token verification error:", tokenError);
      return res.status(400).json({ 
        message: "პაროლის აღდგენის ბმული არასწორია ან ვადაგასულია",
        valid: false,
        tokenExpired: true
      });
    }

    if (decoded.type !== 'password_reset') {
      console.log("Invalid token type:", decoded.type);
      return res.status(400).json({ 
        message: "არასწორი ტოკენის ტიპი",
        valid: false
      });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      console.log("User not found with ID:", decoded.id);
      return res.status(400).json({ 
        message: "მომხმარებელი ვერ მოიძებნა",
        valid: false
      });
    }

    res.status(200).json({ 
      message: "ტოკენი ვალიდურია",
      valid: true,
      email: decoded.email
    });

  } catch (err) {
    console.error("Error verifying reset token:", err);
    res.status(500).json({ 
      message: "სერვერის შეცდომა",
      valid: false,
      error: err.message 
    });
  }
};

module.exports = {
  register,
  verifyEmail,
  login,
  googleLogin,
  resendVerification,
  forgotPassword,
  resetPassword,
  verifyResetToken,
  logout
};