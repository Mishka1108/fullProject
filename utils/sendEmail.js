// // utils/sendEmail.js
// const nodemailer = require('nodemailer');
// require('dotenv').config();

// /**
//  * ოპტიმიზებული ელფოსტის გაგზავნის სერვისი
//  * სპამში არმოხვედრის თავიდან ასაცილებლად
//  */

// const createTransporter = () => {
//   return nodemailer.createTransport({ // ← ესაა გასწორება: createTransport (არა createTransporter)
//     service: 'gmail', // მნიშვნელოვანია service-ის გამოყენება
//     auth: {
//       user: process.env.EMAIL_USER,
//       pass: process.env.EMAIL_PASS // App Password არა regular password
//     },
//     // ამ პარამეტრების მოშორება ზოგჯერ უშველის
//     tls: {
//       rejectUnauthorized: false
//     }
//   });
// };

// /**
//  * ვერიფიკაციის ელფოსტის გაგზავნა
//  */
// const sendVerificationEmail = async (to, subject, verificationUrl) => {
//   const transporter = createTransporter();
  
//   const siteName = process.env.SITE_NAME || 'MarketZone';
//   const supportEmail = process.env.EMAIL_USER; // არა ADMIN_EMAIL
  
//   // ᲡᲞᲐᲛᲘᲡ ᲗᲐᲕᲘᲓᲐᲜ ᲐᲪᲘᲚᲔᲑᲘᲡ ᲫᲘᲠᲘᲗᲐᲓᲘ ᲠᲩᲔᲕᲔᲑᲘ:
  
//   // 1. მარტივი HTML Template (ზედმეტი styles-ების გარეშე)
//   const htmlContent = `
// <!DOCTYPE html>
// <html>
// <head>
//     <meta charset="utf-8">
//     <title>ელფოსტის ვერიფიკაცია</title>
// </head>
// <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
//     <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 5px;">
        
//         <h2 style="color: #333; text-align: center;">ანგარიშის ვერიფიკაცია</h2>
        
//         <p>გამარჯობა,</p>
        
//         <p>მადლობა რეგისტრაციისთვის! თქვენი ანგარიშის გასააქტიურებლად გთხოვთ დააკლიკოთ ქვემო ღილაკზე:</p>
        
//         <div style="text-align: center; margin: 30px 0;">
//             <a href="${verificationUrl}" 
//                style="background-color: #007bff; color: white; text-decoration: none; padding: 12px 30px; border-radius: 4px; display: inline-block;">
//                ანგარიშის გააქტიურება
//             </a>
//         </div>
        
//         <p>ალტერნატიულად, ჩასვით ეს ლინკი ბრაუზერში:</p>
//         <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 3px;">
//             ${verificationUrl}
//         </p>
        
//         <hr style="border: 1px solid #eee; margin: 30px 0;">
        
//         <p style="font-size: 12px; color: #666;">
//             ეს ლინკი მოქმედია 24 საათის განმავლობაში.<br>
//             თუ თქვენ არ მოითხოვეთ ეს ვერიფიკაცია, უგულებელყავით ეს ელფოსტა.
//         </p>
        
//         <p style="font-size: 12px; color: #666;">
//             მადლობა,<br>
//             ${siteName} გუნდი
//         </p>
        
//     </div>
// </body>
// </html>`;

//   // 2. Plain text version (ძალიან მნიშვნელოვანია!)
//   const textContent = `
// ანგარიშის ვერიფიკაცია

// გამარჯობა,

// მადლობა რეგისტრაციისთვის! თქვენი ანგარიშის გასააქტიურებლად გადადით შემდეგ ლინკზე:

// ${verificationUrl}

// ეს ლინკი მოქმედია 24 საათის განმავლობაში.

// თუ თქვენ არ მოითხოვეთ ეს ვერიფიკაცია, უგულებელყავით ეს ელფოსტა.

// მადლობა,
// ${siteName} გუნდი
// `;

//   // 3. ოპტიმიზებული Mail Options
//   const mailOptions = {
//     from: `"${siteName}" <${process.env.EMAIL_USER}>`, // ამ ფორმატის გამოყენება
//     to: to,
//     subject: 'ანგარიშის გააქტიურება', // მარტივი subject
//     text: textContent, // ძალიან მნიშვნელოვანია!
//     html: htmlContent
//   };

//   try {
//     console.log('ელფოსტის გაგზავნა...');
//     const info = await transporter.sendMail(mailOptions);
    
//     console.log('✓ ელფოსტა წარმატებით გაიგზავნა:', info.messageId);
    
//     return { 
//       success: true, 
//       messageId: info.messageId
//     };
    
//   } catch (error) {
//     console.error('❌ შეცდომა ელფოსტის გაგზავნისას:', error);
//     throw error;
    
//   } finally {
//     transporter.close();
//   }
// };

// /**
//  * ზოგადი ელფოსტის გაგზავნის ფუნქცია
//  */
// const sendEmail = async (to, subject, message, html = null) => {
//   if (!to || !subject || !message) {
//     throw new Error('საჭირო პარამეტრები არ არის მითითებული');
//   }

//   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//   if (!emailRegex.test(to)) {
//     throw new Error('არასწორი ელფოსტის ფორმატი');
//   }

//   // ვერიფიკაციის ელფოსტისთვის სპეციალური მეთოდი
//   if (subject.toLowerCase().includes('verify') || 
//       subject.toLowerCase().includes('ვერიფიკაცია') ||
//       subject.toLowerCase().includes('verification') ||
//       message.includes('http')) {
    
//     let verificationUrl = message;
    
//     if (message.includes('http')) {
//       const urlMatch = message.match(/(https?:\/\/[^\s]+)/);
//       if (urlMatch) {
//         verificationUrl = urlMatch[1];
//       }
//     }
    
//     return sendVerificationEmail(to, subject, verificationUrl);
//   }

//   // რეგულარული ელფოსტებისთვის
//   const transporter = createTransporter();
//   const siteName = process.env.SITE_NAME || 'MarketZone';

//   const mailOptions = {
//     from: `"${siteName}" <${process.env.EMAIL_USER}>`,
//     to: to,
//     subject: subject,
//     text: message,
//     html: html || `
// <!DOCTYPE html>
// <html>
// <head>
//     <meta charset="utf-8">
//     <title>${subject}</title>
// </head>
// <body style="font-family: Arial, sans-serif; padding: 20px;">
//     <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px;">
//         <h2>${subject}</h2>
//         <div>${message.replace(/\n/g, '<br>')}</div>
//         <hr>
//         <p style="font-size: 12px; color: #666;">
//             მადლობა,<br>
//             ${siteName} გუნდი
//         </p>
//     </div>
// </body>
// </html>`
//   };

//   try {
//     const info = await transporter.sendMail(mailOptions);
//     console.log('✓ ელფოსტა წარმატებით გაიგზავნა:', info.messageId);
    
//     return { 
//       success: true, 
//       messageId: info.messageId
//     };
    
//   } catch (error) {
//     console.error('❌ შეცდომა ელფოსტის გაგზავნისას:', error);
//     throw error;
    
//   } finally {
//     transporter.close();
//   }
// };

// module.exports = sendEmail;


// utils/sendEmail.js
const nodemailer = require('nodemailer');
require('dotenv').config();

/**
 * ოპტიმიზებული ელფოსტის გაგზავნის სერვისი
 * სპამში არმოხვედრის თავიდან ასაცილებლად
 */

const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    // TLS კონფიგურაცია უბრალოდ ამოვშალოთ
    // Gmail-ის default settings-ი საკმარისია
  });
};

/**
 * ვერიფიკაციის ელფოსტის გაგზავნა
 */
const sendVerificationEmail = async (to, subject, verificationUrl) => {
  const transporter = createTransporter();
  
  const siteName = process.env.SITE_NAME || 'MarketZone';
  const supportEmail = process.env.EMAIL_USER;
  
  // SPAM-ის წინააღმდეგ ოპტიმიზაცია:
  const htmlContent = `
<!DOCTYPE html>
<html lang="ka">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ანგარიშის ვერიფიკაცია - ${siteName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f8f9fa;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e9ecef;">
        
        <!-- Header -->
        <div style="background-color: #007bff; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; font-weight: normal;">${siteName}</h1>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 30px;">
            <h2 style="color: #212529; margin-bottom: 20px; font-size: 20px;">ანგარიშის დადასტურება</h2>
            
            <p style="color: #6c757d; line-height: 1.6; margin-bottom: 25px;">
                გამარჯობა! თქვენი ანგარიშის დასაცავად გთხოვთ დააკლიკოთ ქვემო ღილაკზე.
            </p>
            
            <div style="text-align: center; margin: 35px 0;">
                <a href="${verificationUrl}" 
                   style="background-color: #28a745; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 6px; display: inline-block; font-weight: 500; border: none;">
                   ანგარიშის დადასტურება
                </a>
            </div>
            
            <p style="color: #6c757d; font-size: 14px; line-height: 1.5; margin-top: 30px;">
                ან დააკოპირეთ ეს ლინკი ბრაუზერში:
            </p>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; word-break: break-all; font-family: monospace; font-size: 14px; color: #495057;">
                ${verificationUrl}
            </div>
            
            <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #e9ecef;">
                <p style="color: #6c757d; font-size: 13px; margin: 0;">
                    ეს ლინკი ვალიდურია 24 საათის განმავლობაში.<br>
                    თუ თქვენ არ მოითხოვეთ ეს ვერიფიკაცია, უგულებელყავით ეს მესიჯი.
                </p>
            </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
            <p style="color: #6c757d; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} ${siteName}. ყველა უფლება დაცულია.
            </p>
            <p style="color: #6c757d; font-size: 12px; margin: 10px 0 0 0;">
                კითხვების შემთხვევაში მოგვწერეთ: ${supportEmail}
            </p>
        </div>
        
    </div>
</body>
</html>`;

  // Plain text version (ძალიან მნიშვნელოვანია!)
  const textContent = `
${siteName} - ანგარიშის დადასტურება

გამარჯობა!

თქვენი ანგარიშის დასაცავად გთხოვთ გადადით შემდეგ ლინკზე:

${verificationUrl}

ეს ლინკი ვალიდურია 24 საათის განმავლობაში.

თუ თქვენ არ მოითხოვეთ ეს ვერიფიკაცია, უგულებელყავით ეს მესიჯი.

მადლობა,
${siteName} გუნდი

კითხვების შემთხვევაში: ${supportEmail}
`;

  // ოპტიმიზებული Mail Options
  const mailOptions = {
    from: `"${siteName}" <${process.env.EMAIL_USER}>`,
    to: to,
    subject: `${siteName} - ანგარიშის დადასტურება`, // უკეთესი subject
    text: textContent,
    html: htmlContent,
    // ამ headers-ების დამატება:
    headers: {
      'X-Priority': '1',
      'X-MSMail-Priority': 'High',
      'Importance': 'high',
      'List-Unsubscribe': `<mailto:${supportEmail}?subject=unsubscribe>`,
      'X-Entity-Ref-ID': `${siteName}-verification`
    }
  };

  try {
    console.log('ელფოსტის გაგზავნა...');
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✓ ელფოსტა წარმატებით გაიგზავნა:', info.messageId);
    
    return { 
      success: true, 
      messageId: info.messageId,
      response: info.response
    };
    
  } catch (error) {
    console.error('❌ შეცდომა ელფოსტის გაგზავნისას:', error);
    
    // დეტალური error handling
    if (error.code === 'EAUTH') {
      console.error('Authentication failed - შეამოწმეთ App Password');
    } else if (error.code === 'ECONNECTION') {
      console.error('Connection failed - ინტერნეტ კავშირი');
    }
    
    throw error;
    
  } finally {
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

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(to)) {
    throw new Error('არასწორი ელფოსტის ფორმატი');
  }

  // ვერიფიკაციის ელფოსტისთვის სპეციალური მეთოდი
  if (subject.toLowerCase().includes('verify') || 
      subject.toLowerCase().includes('ვერიფიკაცია') ||
      subject.toLowerCase().includes('verification') ||
      subject.toLowerCase().includes('დადასტურება') ||
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
<html lang="ka">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8f9fa;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border: 1px solid #e9ecef;">
        <h2 style="color: #212529; margin-bottom: 20px;">${subject}</h2>
        <div style="color: #6c757d; line-height: 1.6;">${message.replace(/\n/g, '<br>')}</div>
        <hr style="border: 1px solid #e9ecef; margin: 30px 0;">
        <p style="font-size: 12px; color: #6c757d; margin: 0;">
            მადლობა,<br>
            ${siteName} გუნდი
        </p>
    </div>
</body>
</html>`,
    headers: {
      'List-Unsubscribe': `<mailto:${process.env.EMAIL_USER}?subject=unsubscribe>`
    }
  };

  try {
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

/**
 * Email deliverability test
 */
const testEmailDeliverability = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✓ SMTP კავშირი წარმატებულია');
    return true;
  } catch (error) {
    console.error('❌ SMTP კავშირის შეცდომა:', error);
    return false;
  }
};

module.exports = { 
  sendEmail, 
  sendVerificationEmail, 
  testEmailDeliverability 
};
