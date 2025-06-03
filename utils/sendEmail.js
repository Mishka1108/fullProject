// utils/sendEmail.js
const nodemailer = require('nodemailer');
require('dotenv').config();

/**
 * ოპტიმიზებული ელფოსტის გაგზავნის სერვისი Gmail SMTP-ით
 * სპამში არმოხვედრის თავიდან ასაცილებლად
 */

const createTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // TLS
    auth: {
      user: process.env.EMAIL_USER, // mr.mishka3003@gmail.com
      pass: process.env.EMAIL_PASS  // App Password
    },
    tls: {
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2'
    },
    // Connection pooling
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 5,
    // Timeout settings
    connectionTimeout: 60000,
    greetingTimeout: 30000,
    socketTimeout: 60000
  });
};

/**
 * ვერიფიკაციის ელფოსტის გაგზავნა
 */
const sendVerificationEmail = async (to, subject, verificationUrl) => {
  const transporter = createTransporter();
  
  // Environment variables
  const siteName = process.env.SITE_NAME || 'MarketZone';
  const siteUrl = process.env.BASE_URL || 'http://localhost:10000';
  const supportEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
  
  // Clean HTML Template - Anti-Spam Optimized
  const htmlContent = `
<!DOCTYPE html>
<html lang="ka">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ელფოსტის ვერიფიკაცია - ${siteName}</title>
  <style>
    body {
      font-family: Arial, Helvetica, sans-serif;
      line-height: 1.6;
      color: #333333;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      background-color: #2c5aa0;
      color: white;
      text-align: center;
      padding: 30px 20px;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: normal;
    }
    .content {
      padding: 40px 30px;
    }
    .content h2 {
      color: #2c5aa0;
      margin-bottom: 20px;
      font-size: 24px;
    }
    .content p {
      margin-bottom: 16px;
      font-size: 16px;
      line-height: 1.5;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    .verify-btn {
      display: inline-block;
      padding: 16px 32px;
      background-color: #2c5aa0;
      color: #ffffff;
      text-decoration: none;
      border-radius: 6px;
      font-size: 16px;
      font-weight: bold;
    }
    .url-box {
      background-color: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 4px;
      padding: 12px;
      font-family: monospace;
      font-size: 14px;
      word-break: break-all;
      margin: 16px 0;
    }
    .notice {
      background-color: #fff3cd;
      border: 1px solid #ffeaa7;
      border-radius: 4px;
      padding: 16px;
      margin: 20px 0;
      font-size: 14px;
      color: #856404;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 20px 30px;
      text-align: center;
      font-size: 14px;
      color: #6c757d;
      border-top: 1px solid #dee2e6;
    }
    .footer a {
      color: #2c5aa0;
      text-decoration: none;
    }
    @media only screen and (max-width: 600px) {
      .content {
        padding: 20px;
      }
      .verify-btn {
        display: block;
        text-align: center;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${siteName}</h1>
    </div>
    
    <div class="content">
      <h2>გამარჯობა!</h2>
      
      <p>მადლობა ${siteName}-ზე რეგისტრაციისთვის. მოგესალმებით ჩვენს პლატფორმაზე!</p>
      
      <p>თქვენი ანგარიშის უსაფრთხოებისთვის საჭიროა ელფოსტის მისამართის ვერიფიკაცია. გთხოვთ დააკლიკოთ ქვემოთ მოცემულ ღილაკზე:</p>
      
      <div class="button-container">
        <a href="${verificationUrl}" class="verify-btn" style="color: #ffffff;">ელფოსტის ვერიფიკაცია</a>
      </div>
      
      <p style="font-size: 14px; color: #6c757d;">თუ ღილაკი არ მუშაობს, დააკოპირეთ შემდეგი ლინკი და ჩასვით ბრაუზერში:</p>
      
      <div class="url-box">${verificationUrl}</div>
      
      <div class="notice">
        <strong>მნიშვნელოვანი:</strong> ეს ლინკი მოქმედია 24 საათის განმავლობაში. თუ არ მოითხოვეთ რეგისტრაცია, უგულებელყავით ეს შეტყობინება.
      </div>
      
      <p>კითხვების შემთხვევაში დაგვიკავშირდით: <a href="mailto:${supportEmail}">${supportEmail}</a></p>
    </div>
    
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${siteName}. ყველა უფლება დაცულია.</p>
      <p>
        <a href="${siteUrl}/privacy">კონფიდენციალურობა</a> | 
        <a href="${siteUrl}/terms">წესები</a> | 
        <a href="mailto:${supportEmail}">დახმარება</a>
      </p>
    </div>
  </div>
</body>
</html>`;

  // Plain text version
  const textContent = `
${siteName} - ელფოსტის ვერიფიკაცია

გამარჯობა!

მადლობა ${siteName}-ზე რეგისტრაციისთვის.

თქვენი ანგარიშის ვერიფიკაციისთვის გადადით შემდეგ ლინკზე:
${verificationUrl}

ეს ლინკი მოქმედია 24 საათის განმავლობაში.

თუ არ მოითხოვეთ რეგისტრაცია, უგულებელყავით ეს შეტყობინება.

კითხვების შემთხვევაში: ${supportEmail}

---
${siteName}
${siteUrl}
© ${new Date().getFullYear()} ${siteName}
`;

  // Optimized mail options
  const mailOptions = {
    from: {
      name: siteName,
      address: process.env.EMAIL_USER
    },
    to: to,
    subject: `ელფოსტის ვერიფიკაცია - ${siteName}`,
    text: textContent,
    html: htmlContent,
    headers: {
      // Unique Message-ID
      'Message-ID': `<${Date.now()}-${Math.random().toString(36).substring(2, 15)}@gmail.com>`,
      'Date': new Date().toUTCString(),
      'X-Mailer': `NodeMailer via ${siteName}`,
      'X-Priority': '3',
      'Importance': 'Normal',
      'X-MSMail-Priority': 'Normal',
      
      // Gmail-specific headers
      'X-Google-DKIM-Signature': 'v=1; a=rsa-sha256; c=relaxed/relaxed',
      'X-Gm-Message-State': 'AOJu0YwQ',
      
      // List management (important for spam prevention)
      'List-Unsubscribe': `<mailto:${supportEmail}?subject=unsubscribe>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      'List-Id': `${siteName} Notifications <notifications@gmail.com>`,
      
      // Reply configuration
      'Reply-To': supportEmail,
      'Return-Path': process.env.EMAIL_USER,
      
      // Content classification
      'X-Auto-Response-Suppress': 'All',
      'Precedence': 'bulk',
      'X-Campaign-Type': 'transactional-verification',
      
      // Security headers
      'Authentication-Results': 'gmail.com; spf=pass',
      'Received-SPF': 'pass',
      
      // Organization info
      'Organization': siteName,
      'X-Sender': siteName
    },
    
    // Envelope settings
    envelope: {
      from: process.env.EMAIL_USER,
      to: [to]
    },
    
    // Delivery status notifications
    dsn: {
      id: `verification-${Date.now()}`,
      return: 'headers',
      notify: ['failure'],
      recipient: to
    }
  };

  try {
    // Verify SMTP connection
    console.log('Gmail SMTP კავშირის შემოწმება...');
    await transporter.verify();
    console.log('✓ Gmail SMTP კავშირი დადასტურებულია');
    
    // Send email
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✓ ვერიფიკაციის ელფოსტა წარმატებით გაიგზავნა');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    
    return { 
      success: true, 
      messageId: info.messageId,
      response: info.response 
    };
    
  } catch (error) {
    console.error('❌ შეცდომა ელფოსტის გაგზავნისას:', error);
    
    // Detailed error logging
    if (error.code) {
      console.error('Error Code:', error.code);
    }
    if (error.response) {
      console.error('SMTP Response:', error.response);
    }
    if (error.responseCode) {
      console.error('Response Code:', error.responseCode);
    }
    
    throw new Error(`Email sending failed: ${error.message}`);
    
  } finally {
    // Close connection
    transporter.close();
  }
};

/**
 * ზოგადი ელფოსტის გაგზავნის ფუნქცია
 */
const sendEmail = async (to, subject, message, html = null) => {
  // Input validation
  if (!to || !subject || !message) {
    throw new Error('საჭირო პარამეტრები არ არის მითითებული');
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to)) {
    throw new Error('არასწორი ელფოსტის ფორმატი');
  }

  // Route to verification email if needed
  if (subject.toLowerCase().includes('verify') || 
      subject.toLowerCase().includes('ვერიფიკაცია') ||
      subject.toLowerCase().includes('verification')) {
    
    let verificationUrl = message;
    
    // Extract URL from different formats
    if (message.includes('Click here to verify: ')) {
      verificationUrl = message.split('Click here to verify: ')[1];
    } else if (message.includes('http')) {
      const urlMatch = message.match(/(https?:\/\/[^\s]+)/);
      if (urlMatch) {
        verificationUrl = urlMatch[1];
      }
    }
    
    return sendVerificationEmail(to, subject, verificationUrl);
  }

  // Regular email sending
  const transporter = createTransporter();
  const siteName = process.env.SITE_NAME || 'MarketZone';
  const siteUrl = process.env.BASE_URL || 'http://localhost:10000';
  const supportEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

  const mailOptions = {
    from: {
      name: siteName,
      address: process.env.EMAIL_USER
    },
    to: to,
    subject: `${subject} - ${siteName}`,
    text: message,
    html: html || `
<!DOCTYPE html>
<html lang="ka">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
    <div style="background-color: #2c5aa0; color: white; text-align: center; padding: 20px;">
      <h1 style="margin: 0; font-size: 24px;">${siteName}</h1>
    </div>
    <div style="padding: 30px;">
      <h2 style="color: #2c5aa0; margin-bottom: 20px;">${subject}</h2>
      <div style="line-height: 1.6; color: #333;">${message.replace(/\n/g, '<br>')}</div>
    </div>
    <div style="background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #6c757d; border-top: 1px solid #dee2e6;">
      <p>&copy; ${new Date().getFullYear()} ${siteName} | <a href="${siteUrl}" style="color: #2c5aa0;">${siteUrl}</a></p>
    </div>
  </div>
</body>
</html>`,
    headers: {
      'Message-ID': `<${Date.now()}-${Math.random().toString(36).substring(2, 15)}@gmail.com>`,
      'Date': new Date().toUTCString(),
      'X-Mailer': `NodeMailer via ${siteName}`,
      'X-Priority': '3',
      'Importance': 'Normal',
      'Reply-To': supportEmail,
      'Return-Path': process.env.EMAIL_USER,
      'List-Unsubscribe': `<mailto:${supportEmail}?subject=unsubscribe>`,
      'Organization': siteName
    }
  };

  try {
    await transporter.verify();
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✓ ელფოსტა წარმატებით გაიგზავნა:', info.messageId);
    
    return { 
      success: true, 
      messageId: info.messageId,
      response: info.response 
    };
    
  } catch (error) {
    console.error('❌ შეცდომა ელფოსტის გაგზავნისას:', error);
    throw error;
    
  } finally {
    transporter.close();
  }
};

module.exports = sendEmail;