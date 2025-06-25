// utils/sendEmail.js
const nodemailer = require('nodemailer');
require('dotenv').config();

/**
 * ოპტიმიზებული ელფოსტის გაგზავნის სერვისი
 * სპამში არმოხვედრის თავიდან ასაცილებლად
 */

const createTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail', // მნიშვნელოვანია service-ის გამოყენება
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS // App Password არა regular password
    },
    // ამ პარამეტრების მოშორება ზოგჯერ უშველის
    tls: {
      rejectUnauthorized: false
    }
  });
};

/**
 * ვერიფიკაციის ელფოსტის გაგზავნა
 */
const sendVerificationEmail = async (to, subject, verificationUrl) => {
  const transporter = createTransporter();
  
  const siteName = process.env.SITE_NAME || 'MarketZone';
  const supportEmail = process.env.EMAIL_USER; // არა ADMIN_EMAIL
  
  // ᲡᲞᲐᲛᲘᲡ ᲗᲐᲕᲘᲓᲐᲜ ᲐᲪᲘᲚᲔᲑᲘᲡ ᲫᲘᲠᲘᲗᲐᲓᲘ ᲠᲩᲔᲕᲔᲑᲘ:
  
  // 1. მარტივი HTML Template (ზედმეტი styles-ების გარეშე)
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>ელფოსტის ვერიფიკაცია</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 5px;">
        
        <h2 style="color: #333; text-align: center;">ანგარიშის ვერიფიკაცია</h2>
        
        <p>გამარჯობა,</p>
        
        <p>მადლობა რეგისტრაციისთვის! თქვენი ანგარიშის გასააქტიურებლად გთხოვთ დააკლიკოთ ქვემო ღილაკზე:</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #007bff; color: white; text-decoration: none; padding: 12px 30px; border-radius: 4px; display: inline-block;">
               ანგარიშის გააქტიურება
            </a>
        </div>
        
        <p>ალტერნატიულად, ჩასვით ეს ლინკი ბრაუზერში:</p>
        <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 3px;">
            ${verificationUrl}
        </p>
        
        <hr style="border: 1px solid #eee; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #666;">
            ეს ლინკი მოქმედია 24 საათის განმავლობაში.<br>
            თუ თქვენ არ მოითხოვეთ ეს ვერიფიკაცია, უგულებელყავით ეს ელფოსტა.
        </p>
        
        <p style="font-size: 12px; color: #666;">
            მადლობა,<br>
            ${siteName} გუნდი
        </p>
        
    </div>
</body>
</html>`;

  // 2. Plain text version (ძალიან მნიშვნელოვანია!)
  const textContent = `
ანგარიშის ვერიფიკაცია

გამარჯობა,

მადლობა რეგისტრაციისთვის! თქვენი ანგარიშის გასააქტიურებლად გადადით შემდეგ ლინკზე:

${verificationUrl}

ეს ლინკი მოქმედია 24 საათის განმავლობაში.

თუ თქვენ არ მოითხოვეთ ეს ვერიფიკაცია, უგულებელყავით ეს ელფოსტა.

მადლობა,
${siteName} გუნდი
`;

  // 3. ოპტიმიზებული Mail Options
  const mailOptions = {
    from: `"${siteName}" <${process.env.EMAIL_USER}>`, // ამ ფორმატის გამოყენება
    to: to,
    subject: 'ანგარიშის გააქტიურება', // მარტივი subject
    text: textContent, // ძალიან მნიშვნელოვანია!
    html: htmlContent
  };

  try {
    console.log('ელფოსტის გაგზავნა...');
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✓ ელფოსტა წარმატებით გაიგზავნა:', info.messageId);
    
    return { 
      success: true, 
      messageId: info.messageId
    };
    
  } catch (error) {
    console.error('❌ შეცდომა ელფოსტის გაგზავნისას:', error);
    throw error;
    
  } finally {
    transporter.close();
  }
};

/**
 * ზოგადი ელფოსტის გაგზავნის ფუნქცია
 */
const sendEmail = async (to, subject, message, html = null) => {
  if (!to || !subject || !message) {
    throw new Error('საჭირო პარამეტრები არ არის მითითებული');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to)) {
    throw new Error('არასწორი ელფოსტის ფორმატი');
  }

  // ვერიფიკაციის ელფოსტისთვის სპეციალური მეთოდი
  if (subject.toLowerCase().includes('verify') || 
      subject.toLowerCase().includes('ვერიფიკაცია') ||
      subject.toLowerCase().includes('verification') ||
      message.includes('http')) {
    
    let verificationUrl = message;
    
    if (message.includes('http')) {
      const urlMatch = message.match(/(https?:\/\/[^\s]+)/);
      if (urlMatch) {
        verificationUrl = urlMatch[1];
      }
    }
    
    return sendVerificationEmail(to, subject, verificationUrl);
  }

  // რეგულარული ელფოსტებისთვის
  const transporter = createTransporter();
  const siteName = process.env.SITE_NAME || 'MarketZone';

  const mailOptions = {
    from: `"${siteName}" <${process.env.EMAIL_USER}>`,
    to: to,
    subject: subject,
    text: message,
    html: html || `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${subject}</title>
</head>
<body style="font-family: Arial, sans-serif; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px;">
        <h2>${subject}</h2>
        <div>${message.replace(/\n/g, '<br>')}</div>
        <hr>
        <p style="font-size: 12px; color: #666;">
            მადლობა,<br>
            ${siteName} გუნდი
        </p>
    </div>
</body>
</html>`
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✓ ელფოსტა წარმატებით გაიგზავნა:', info.messageId);
    
    return { 
      success: true, 
      messageId: info.messageId
    };
    
  } catch (error) {
    console.error('❌ შეცდომა ელფოსტის გაგზავნისას:', error);
    throw error;
    
  } finally {
    transporter.close();
  }
};

module.exports = sendEmail;