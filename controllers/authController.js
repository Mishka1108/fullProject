// controllers/authController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sendEmail = require('../utils/sendEmail');

/**
 * Register a new user
 * @route POST /api/auth/register
 */
exports.register = async (req, res) => {
  try {
    const { name, secondName, email, password } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Create new user
    user = new User({
      name,
      secondName,
      email,
      password
    });

    // Hash password before saving
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    // Create email verification token
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
      "Email Verification",
      `Click here to verify: ${verificationUrl}`
    );

    res.status(201).json({ 
      message: "User registered successfully. Please verify your email." 
    });
  } catch (err) {
    console.error("Error registering user:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Verify user email with token
 * @route GET /api/auth/verify/:token
 */
exports.verifyEmail = async (req, res) => {
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
          // Auto redirect after 3 seconds
          setTimeout(function() {
            window.location.href = "${process.env.CLIENT_URL}/auth/login";
          }, 3000);
        </script>
      </head>
      <body>
        <div class="container">
          <div class="success-icon">✓</div>
          <h1>Email Successfully Verified!</h1>
          <p>Your account is now active and you can log in.</p>
          <a href="${process.env.CLIENT_URL}/auth/login" class="button">Go to Login</a>
          <p class="redirect-message">You will be redirected automatically in 3 seconds...</p>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    console.error("Error verifying email:", err);
    
    // HTML response for verification error
    res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verification Error</title>
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
          .error-icon {
            color: #f44336;
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
          // Auto redirect after 5 seconds
          setTimeout(function() {
            window.location.href = "${process.env.CLIENT_URL}/auth/login";
          }, 5000);
        </script>
      </head>
      <body>
        <div class="container">
          <div class="error-icon">✗</div>
          <h1>Verification Error</h1>
          <p>There was an error with the verification process. The token may be expired or invalid.</p>
          <a href="${process.env.CLIENT_URL}/auth/login" class="button">Go to Login Page</a>
          <p class="redirect-message">You will be redirected automatically in 5 seconds...</p>
        </div>
      </body>
      </html>
    `);
  }
};

/**
 * Login user
 * @route POST /api/auth/login
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check if user is verified
    if (!user.isVerified) {
      return res.status(400).json({ message: "Please verify your email before logging in" });
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
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
            isVerified: user.isVerified
          }
        });
      }
    );
  } catch (err) {
    console.error("Error logging in:", err);
    res.status(500).json({ message: "Server error" });
  }
};