// utils/sendEmail2.js
const nodemailer = require('nodemailer');

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
  return nodemailer.createTransport({  // ← აქ უნდა იყოს createTransport
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

/**
 * ზოგადი ელფოსტის გაგზავნის ფუნქცია
 */
const sendEmail = async (to, subject, htmlContent) => {
  try {
    console.log('Creating email transporter...');
    const transporter = createTransporter();

    console.log('Preparing email options...');
    const mailOptions = {
      from: `"iMarketZone" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      html: htmlContent
    };

    console.log('Sending email to:', to);
    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    
    return {
      success: true,
      messageId: result.messageId,
      message: 'Email sent successfully'
    };
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error(`Email sending failed: ${error.message}`);
  }
};

/**
 * ვერიფიკაციის ელფოსტის გაგზავნა
 */
const sendVerificationEmail = async (email, subject, verificationUrl) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="ka">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ანგარიშის გააქტიურება</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .container {
                background: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
            }
            .logo {
                font-size: 24px;
                font-weight: bold;
                color: #2c5aa0;
                margin-bottom: 10px;
            }
            .title {
                color: #333;
                font-size: 20px;
                margin-bottom: 20px;
            }
            .content {
                margin-bottom: 30px;
            }
            .button {
                display: inline-block;
                background-color: #2c5aa0;
                color: white;
                text-decoration: none;
                padding: 12px 30px;
                border-radius: 5px;
                font-weight: bold;
                text-align: center;
                margin: 20px 0;
            }
            .button:hover {
                background-color: #1e3d6f;
            }
            .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                text-align: center;
                color: #666;
                font-size: 14px;
            }
            .warning {
                background-color: #fff3cd;
                border: 1px solid #ffeaa7;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
                color: #856404;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">iMarketZone</div>
                <h1 class="title">ანგარიშის გააქტიურება</h1>
            </div>
            
            <div class="content">
                <p>გამარჯობა!</p>
                <p>მადლობა iMarketZone-ში რეგისტრაციისთვის. თქვენი ანგარიშის გასააქტიურებლად, გთხოვთ დააჭიროთ ქვემოთ მოთავსებულ ღილაკს:</p>
                
                <div style="text-align: center;">
                    <a href="${verificationUrl}" class="button">ანგარიშის გააქტიურება</a>
                </div>
                
                <p>ან დააკოპირეთ და ჩასვით ეს ბმული თქვენს ბრაუზერში:</p>
                <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 5px;">
                    ${verificationUrl}
                </p>
                
                <div class="warning">
                    <strong>ყურადღება:</strong> ეს ბმული მოქმედია 24 საათის განმავლობაში.
                </div>
            </div>
            
            <div class="footer">
                <p>თუ თქვენ არ დარეგისტრირებულხართ ჩვენს საიტზე, უბრალოდ იგნორირება გაუკეთეთ ამ ელფოსტას.</p>
                <p>&copy; 2024 iMarketZone. ყველა უფლება დაცულია.</p>
            </div>
        </div>
    </body>
    </html>
  `;

  return await sendEmail(email, subject, htmlContent);
};

/**
 * პაროლის აღდგენის ელფოსტის გაგზავნა
 */
const sendPasswordResetEmail = async (email, subject, resetUrl, userName = '') => {
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="ka">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>პაროლის აღდგენა</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .container {
                background: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
            }
            .logo {
                font-size: 24px;
                font-weight: bold;
                color: #2c5aa0;
                margin-bottom: 10px;
            }
            .title {
                color: #333;
                font-size: 20px;
                margin-bottom: 20px;
            }
            .content {
                margin-bottom: 30px;
            }
            .button {
                display: inline-block;
                background-color: #dc3545;
                color: white;
                text-decoration: none;
                padding: 12px 30px;
                border-radius: 5px;
                font-weight: bold;
                text-align: center;
                margin: 20px 0;
            }
            .button:hover {
                background-color: #c82333;
            }
            .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                text-align: center;
                color: #666;
                font-size: 14px;
            }
            .warning {
                background-color: #f8d7da;
                border: 1px solid #f5c6cb;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
                color: #721c24;
            }
            .security-notice {
                background-color: #d1ecf1;
                border: 1px solid #bee5eb;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
                color: #0c5460;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">iMarketZone</div>
                <h1 class="title">პაროლის აღდგენა</h1>
            </div>
            
            <div class="content">
                <p>გამარჯობა${userName ? `, ${userName}` : ''}!</p>
                <p>მივიღეთ თხოვნა თქვენი ანგარიშის პაროლის აღდგენაზე. პაროლის განახლებისთვის, გთხოვთ დააჭიროთ ქვემოთ მოთავსებულ ღილაკს:</p>
                
                <div style="text-align: center;">
                    <a href="${resetUrl}" class="button">პაროლის აღდგენა</a>
                </div>
                
                <p>ან დააკოპირეთ და ჩასვით ეს ბმული თქვენს ბრაუზერში:</p>
                <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 5px;">
                    ${resetUrl}
                </p>
                
                <div class="warning">
                    <strong>მნიშვნელოვანი:</strong> ეს ბმული მოქმედია მხოლოდ 1 საათის განმავლობაში უსაფრთხოების მიზნებისთვის.
                </div>
                
                <div class="security-notice">
                    <strong>უსაფრთხოების რჩევები:</strong>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                        <li>ახალი პაროლი უნდა შედგებოდეს მინიმუმ 8 სიმბოლოსგან</li>
                        <li>გამოიყენეთ დიდი და პატარა ასოების, ციფრებისა და სპეციალური სიმბოლოების კომბინაცია</li>
                        <li>არ გამოიყენოთ ადვილად გამოსაცნობი პაროლები</li>
                    </ul>
                </div>
            </div>
            
            <div class="footer">
                <p><strong>თუ თქვენ არ თხოვეთ პაროლის აღდგენა, უბრალოდ იგნორირება გაუკეთეთ ამ ელფოსტას.</strong></p>
                <p>თქვენი ანგარიში დაცული რჩება და არანაირი ცვლილება არ განხორციელდება.</p>
                <p>&copy; 2025 iMarketZone. ყველა უფლება დაცულია.</p>
            </div>
        </div>
    </body>
    </html>
  `;

  return await sendEmail(email, subject, htmlContent);
};

/**
 * ზოგადი შეტყობინების ელფოსტის გაგზავნა
 */
const sendNotificationEmail = async (email, subject, message, userName = '') => {
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="ka">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .container {
                background: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
            }
            .logo {
                font-size: 24px;
                font-weight: bold;
                color: #2c5aa0;
                margin-bottom: 10px;
            }
            .title {
                color: #333;
                font-size: 20px;
                margin-bottom: 20px;
            }
            .content {
                margin-bottom: 30px;
            }
            .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                text-align: center;
                color: #666;
                font-size: 14px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">iMarketZone</div>
                <h1 class="title">${subject}</h1>
            </div>
            
            <div class="content">
                <p>გამარჯობა${userName ? `, ${userName}` : ''}!</p>
                <p>${message}</p>
            </div>
            
            <div class="footer">
                <p>&copy; 2024 iMarketZone. ყველა უფლება დაცულია.</p>
            </div>
        </div>
    </body>
    </html>
  `;

  return await sendEmail(email, subject, htmlContent);
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendNotificationEmail
};