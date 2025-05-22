// utils/sendEmail.js
const nodemailer = require('nodemailer');
require('dotenv').config();

/**
 * გაუმჯობესებული ელფოსტის გაგზავნის სერვისი
 * მთავარი ცვლილებები:
 * 1. დამატებულია HTML ფორმატირება ვერიფიკაციის ელფოსტისთვის
 * 2. გაუმჯობესებულია ელფოსტის თემა (subject)
 * 3. დამატებულია პლეინტექსტ ალტერნატივა (მნიშვნელოვანია სპამში არმოხვედრისთვის)
 * 4. გაუმჯობესებულია ტრანსპორტერის კონფიგურაცია
 */

const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    // სპამში არმოხვედრისთვის მნიშვნელოვანი პარამეტრები
    tls: {
      rejectUnauthorized: false
    },
    // DKIM, SPF, და DMARC ავტომატურად უნდა შემოწმდეს
    secure: true,
  });
};

/**
 * ვერიფიკაციის ელფოსტის გაგზავნა
 * @param {string} to - მიმღების ელფოსტა
 * @param {string} subject - ელფოსტის თემა
 * @param {string} verificationUrl - ვერიფიკაციის URL
 * @returns {Promise} - ელფოსტის გაგზავნის დაპირება
 */
const sendVerificationEmail = async (to, subject, verificationUrl) => {
  const transporter = createTransporter();
  const siteName = process.env.SITE_NAME || 'ჩვენი საიტი';
  const siteUrl = process.env.BASE_URL || 'https://example.com';
  
  // მოვამზადოთ HTML კონტენტი
  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ელფოსტის ვერიფიკაცია</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        padding: 20px;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
        border: 1px solid #ddd;
        border-radius: 5px;
      }
      .header {
        text-align: center;
        padding-bottom: 10px;
        border-bottom: 1px solid #eee;
      }
      .button {
        display: inline-block;
        padding: 10px 20px;
        background-color: #4CAF50;
        color: white;
        text-decoration: none;
        border-radius: 4px;
        margin: 20px 0;
      }
      .footer {
        margin-top: 30px;
        text-align: center;
        font-size: 12px;
        color: #777;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h2>${siteName}</h2>
      </div>
      <h3>გამარჯობა!</h3>
      <p>მადლობა რეგისტრაციისთვის ${siteName}-ზე.</p>
      <p>თქვენი ანგარიშის გასააქტიურებლად, გთხოვთ დააკლიკოთ ქვემოთ მოცემულ ღილაკს:</p>
      
      <div style="text-align: center;">
        <a href="${verificationUrl}" class="button">ელფოსტის ვერიფიკაცია</a>
      </div>
      
      <p>ან დააკოპირეთ და ჩასვით შემდეგი ბმული თქვენს ბრაუზერში:</p>
      <p>${verificationUrl}</p>
      
      <p>თუ თქვენ არ მოითხოვეთ რეგისტრაცია, უბრალოდ უგულებელყავით ეს ელფოსტა.</p>
      
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} ${siteName}. ყველა უფლება დაცულია.</p>
        <p>
          <a href="${siteUrl}/privacy">კონფიდენციალურობის პოლიტიკა</a> | 
          <a href="${siteUrl}/terms">გამოყენების პირობები</a>
        </p>
      </div>
    </div>
  </body>
  </html>
  `;

  // მოვამზადოთ ტექსტური კონტენტი (სპამის პრევენციისთვის)
  const textContent = `
გამარჯობა!

მადლობა რეგისტრაციისთვის ${siteName}-ზე.
თქვენი ანგარიშის გასააქტიურებლად, გთხოვთ გადადით შემდეგ ბმულზე:

${verificationUrl}

თუ თქვენ არ მოითხოვეთ რეგისტრაცია, უბრალოდ უგულებელყავით ეს ელფოსტა.

© ${new Date().getFullYear()} ${siteName}. ყველა უფლება დაცულია.
  `;

  const mailOptions = {
    from: {
      name: siteName,
      address: process.env.EMAIL_USER
    },
    to,
    subject: `${subject} - ${siteName}`,
    text: textContent, // ტექსტური ვერსია - მნიშვნელოვანია სპამში არმოხვედრისთვის
    html: htmlContent,
    headers: {
      'X-Priority': '1', // პრიორიტეტის დონის მითითება
      'Precedence': 'Bulk' // მიუთითებს, რომ ეს არ არის სპამი
    }
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('ელფოსტა გაიგზავნა: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('შეცდომა ელფოსტის გაგზავნისას:', error);
    throw error;
  }
};

// ზოგადი ელფოსტის გაგზავნის ფუნქცია
const sendEmail = async (to, subject, message, html = null) => {
  // თუ გამოძახება ვერიფიკაციისთვისაა და შეიცავს ლინკს
  if (subject.toLowerCase().includes('verify') && message.includes('http')) {
    const verificationUrl = message.split('Click here to verify: ')[1];
    return sendVerificationEmail(to, subject, verificationUrl);
  }

  const transporter = createTransporter();
  const siteName = process.env.SITE_NAME || 'ჩვენი საიტი';

  const mailOptions = {
    from: {
      name: siteName,
      address: process.env.EMAIL_USER
    },
    to,
    subject: `${subject} - ${siteName}`,
    text: message,
    html: html || `<p>${message}</p>`,
    headers: {
      'X-Priority': '1',
      'Precedence': 'Bulk'
    }
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('ელფოსტა გაიგზავნა: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('შეცდომა ელფოსტის გაგზავნისას:', error);
    throw error;
  }
};

module.exports = sendEmail;