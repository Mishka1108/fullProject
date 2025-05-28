// utils/sendEmail.js
const nodemailer = require('nodemailer');
require('dotenv').config();

/**
 * გაუმჯობესებული ელფოსტის გაგზავნის სერვისი
 * სპამში არმოხვედრის თავიდან ასაცილებლად
 */

const createTransporter = () => {
  return nodemailer.createTransport({ // createTransport - არა createTransporter
    host: process.env.SMTP_HOST || 'smtp.gmail.com', // SMTP host
    port: process.env.SMTP_PORT || 587, // TLS port
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS // App Password გამოიყენეთ, არა ძირითადი პაროლი
    },
    tls: {
      rejectUnauthorized: true // უსაფრთხოებისთვის
    },
    // Rate limiting და connection pooling
    pool: true,
    maxConnections: 1,
    rateDelta: 1000,
    rateLimit: 5
  });
};

/**
 * ვერიფიკაციის ელფოსტის გაგზავნა
 */
const sendVerificationEmail = async (to, subject, verificationUrl) => {
  const transporter = createTransporter();
  const siteName = process.env.SITE_NAME || 'Your Company';
  const siteUrl = process.env.BASE_URL || 'https://yoursite.com';
  const supportEmail = process.env.SUPPORT_EMAIL || process.env.EMAIL_USER;
  
  // HTML კონტენტი - უკეთ ფორმატირებული
  const htmlContent = `
  <!DOCTYPE html>
  <html lang="ka">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ელფოსტის ვერიფიკაცია</title>
    <style>
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        line-height: 1.6;
        color: #333333;
        margin: 0;
        padding: 20px;
        background-color: #f4f4f4;
      }
      .email-container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        overflow: hidden;
      }
      .header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        text-align: center;
        padding: 30px 20px;
      }
      .header h1 {
        margin: 0;
        font-size: 24px;
        font-weight: 300;
      }
      .content {
        padding: 40px 30px;
      }
      .content p {
        margin-bottom: 20px;
        font-size: 16px;
      }
      .verify-button {
        display: inline-block;
        padding: 15px 30px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white !important;
        text-decoration: none;
        border-radius: 5px;
        font-weight: bold;
        text-align: center;
        margin: 20px 0;
        transition: all 0.3s ease;
      }
      .verify-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
      }
      .footer {
        background-color: #f8f9fa;
        padding: 20px 30px;
        text-align: center;
        font-size: 14px;
        color: #666666;
        border-top: 1px solid #e9ecef;
      }
      .footer a {
        color: #667eea;
        text-decoration: none;
      }
      .security-notice {
        background-color: #fff3cd;
        border: 1px solid #ffeaa7;
        border-radius: 4px;
        padding: 15px;
        margin: 20px 0;
        font-size: 14px;
        color: #856404;
      }
      @media (max-width: 600px) {
        .content {
          padding: 20px;
        }
        .verify-button {
          display: block;
          text-align: center;
        }
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <div class="header">
        <h1>${siteName}</h1>
      </div>
      
      <div class="content">
        <h2 style="color: #333; margin-bottom: 20px;">გამარჯობა!</h2>
        <p>მადლობა რეგისტრაციისთვის <strong>${siteName}</strong>-ზე. ჩვენ მოხარულები ვართ, რომ შემოგვიერთდით!</p>
        
        <p>თქვენი ანგარიშის უსაფრთხოებისთვის, გთხოვთ დაადასტუროთ თქვენი ელფოსტის მისამართი ქვემოთ მოცემული ღილაკის დაკლიკებით:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" class="verify-button">ელფოსტის ვერიფიკაცია</a>
        </div>
        
        <p style="font-size: 14px; color: #666;">თუ ღილაკი არ მუშაობს, დააკოპირეთ და ჩასვით შემდეგი ბმული თქვენს ბრაუზერში:</p>
        <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 14px;">${verificationUrl}</p>
        
        <div class="security-notice">
          <strong>უსაფრთხოების შენიშვნა:</strong> ეს ბმული მოქმედია მხოლოდ 24 საათის განმავლობაში. თუ თქვენ არ მოითხოვეთ ეს რეგისტრაცია, უგულებელყავით ეს ელფოსტა.
        </div>
      </div>
      
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} ${siteName}. ყველა უფლება დაცულია.</p>
        <p>
          <a href="${siteUrl}/privacy">კონფიდენციალურობა</a> | 
          <a href="${siteUrl}/terms">წესები</a> | 
          <a href="mailto:${supportEmail}">დახმარება</a>
        </p>
        <p style="margin-top: 15px; font-size: 12px;">
          თუ აღარ გსურთ ამგვარი ელფოსტების მიღება, <a href="${siteUrl}/unsubscribe">გამოწერის გაუქმება</a>
        </p>
      </div>
    </div>
  </body>
  </html>
  `;

  // Plain text ვერსია
  const textContent = `
${siteName} - ელფოსტის ვერიფიკაცია

გამარჯობა!

მადლობა რეგისტრაციისთვის ${siteName}-ზე.

თქვენი ანგარიშის გასააქტიურებლად, გთხოვთ გადადით შემდეგ ბმულზე:

${verificationUrl}

ეს ბმული მოქმედია მხოლოდ 24 საათის განმავლობაში.

თუ თქვენ არ მოითხოვეთ რეგისტრაცია, უგულებელყავით ეს ელფოსტა.

---
${siteName}
${siteUrl}
დახმარებისთვის: ${supportEmail}

© ${new Date().getFullYear()} ${siteName}. ყველა უფლება დაცულია.
  `;

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
      'Message-ID': `<${Date.now()}.${Math.random()}@${siteName.toLowerCase().replace(/\s+/g, '')}.com>`,
      'X-Mailer': `${siteName} Email Service`,
      'X-Priority': '3', // Normal priority (1=High, 3=Normal, 5=Low)
      'List-Unsubscribe': `<${siteUrl}/unsubscribe>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      'Reply-To': process.env.SUPPORT_EMAIL || process.env.EMAIL_USER
    },
    // Anti-spam configurations
    envelope: {
      from: process.env.EMAIL_USER,
      to: [to]
    }
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('ელფოსტა წარმატებით გაიგზავნა:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('შეცდომა ელფოსტის გაგზავნისას:', error);
    throw error;
  }
};

// ზოგადი ელფოსტის გაგზავნის ფუნქცია
const sendEmail = async (to, subject, message, html = null) => {
  // ვერიფიკაციის ელფოსტისთვის სპეციალური ლოგიკა
  if (subject.toLowerCase().includes('verify') || subject.toLowerCase().includes('ვერიფიკაცია')) {
    let verificationUrl = message;
    
    // URL-ის ამოღება სხვადასხვა ფორმატიდან
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

  // ზოგადი ელფოსტისთვის
  const transporter = createTransporter();
  const siteName = process.env.SITE_NAME || 'Your Company';

  const mailOptions = {
    from: {
      name: siteName,
      address: process.env.EMAIL_USER
    },
    to: to,
    subject: `${subject} - ${siteName}`,
    text: message,
    html: html || `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">${subject}</h2>
        <p style="line-height: 1.6;">${message}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">${siteName}</p>
      </div>
    `,
    headers: {
      'Message-ID': `<${Date.now()}.${Math.random()}@${siteName.toLowerCase().replace(/\s+/g, '')}.com>`,
      'X-Mailer': `${siteName} Email Service`,
      'X-Priority': '3',
      'Reply-To': process.env.SUPPORT_EMAIL || process.env.EMAIL_USER
    }
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('ელფოსტა წარმატებით გაიგზავნა:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('შეცდომა ელფოსტის გაგზავნისას:', error);
    throw error;
  }
};

module.exports = sendEmail;