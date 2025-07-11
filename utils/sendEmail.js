// utils/sendEmail.js
const nodemailer = require('nodemailer');
require('dotenv').config();

/**
 * ოპტიმიზებული ელფოსტის გაგზავნის სერვისი
 * სპამში არმოხვედრის თავიდან ასაცილებლად
 */

const createTransporter = () => {
  return nodemailer.createTransport({ // ✅ Fixed: createTransport (not createTransporter)
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
    // Gmail-ის ოპტიმიზებული კონფიგურაცია
    ,
    pool: true,
    maxConnections: 5,
    maxMessages: 10,
    rateDelta: 1000,
    rateLimit: 5
  });
};

/**
 * ვერიფიკაციის ელფოსტის გაგზავნა სპამ-ფილტრების გავლით
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
    <title>ანგარიშის ვერიფიკაცია</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #ffffff; color: #333333;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        
        <!-- Header -->
        <div style="background-color: #4a90e2; color: white; padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 600;">${siteName}</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">ანგარიშის დადასტურება</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 30px;">
            <h2 style="color: #2c3e50; margin-bottom: 20px; font-size: 24px; font-weight: 600;">მოგესალმებით!</h2>
            
            <p style="color: #34495e; line-height: 1.8; margin-bottom: 25px; font-size: 16px;">
                თქვენი ანგარიშის უსაფრთხოებისთვის აუცილებელია ელფოსტის ვერიფიკაცია. 
                გთხოვთ დააკლიკოთ ქვემო ღილაკზე.
            </p>
            
            <div style="text-align: center; margin: 40px 0;">
                <a href="${verificationUrl}" 
                   style="background-color: #27ae60; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 8px rgba(39, 174, 96, 0.3); transition: all 0.3s ease;">
                   ✓ ვერიფიკაცია
                </a>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 30px 0;">
                <p style="color: #6c757d; font-size: 14px; line-height: 1.6; margin: 0 0 15px 0;">
                    <strong>ალტერნატივა:</strong> თუ ღილაკი არ მუშაობს, დააკოპირეთ ეს ლინკი:
                </p>
                <div style="background-color: #ffffff; padding: 15px; border-radius: 6px; word-break: break-all; font-family: 'Courier New', monospace; font-size: 14px; color: #2c3e50; border: 1px solid #e9ecef;">
                    ${verificationUrl}
                </div>
            </div>
            
            <div style="margin-top: 40px; padding-top: 25px; border-top: 2px solid #ecf0f1;">
                <p style="color: #7f8c8d; font-size: 14px; margin: 0; line-height: 1.6;">
                    <strong>ყურადღება:</strong><br>
                    • ლინკი ვალიდურია 24 საათის განმავლობაში<br>
                    • თუ თქვენ არ მოითხოვეთ ეს ვერიფიკაცია, უგულებელყავით ეს მესიჯი<br>
                    • არ გაუზიაროთ ეს ლინკი სხვებს
                </p>
            </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #34495e; color: #ecf0f1; padding: 25px; text-align: center;">
            <p style="font-size: 14px; margin: 0 0 10px 0;">
                © ${new Date().getFullYear()} ${siteName} - ყველა უფლება დაცულია
            </p>
            <p style="font-size: 13px; margin: 0; opacity: 0.8;">
                კითხვების შემთხვევაში: ${supportEmail}
            </p>
        </div>
        
    </div>
</body>
</html>`;

  // Plain text version (ძალიან მნიშვნელოვანია spam-ის თავიდან ასაცილებლად!)
  const textContent = `
${siteName} - ანგარიშის დადასტურება

მოგესალმებით!

თქვენი ანგარიშის უსაფრთხოებისთვის აუცილებელია ელფოსტის ვერიფიკაცია.

ვერიფიკაციის ლინკი:
${verificationUrl}

ყურადღება:
- ლინკი ვალიდურია 24 საათის განმავლობაში
- თუ თქვენ არ მოითხოვეთ ეს ვერიფიკაცია, უგულებელყავით ეს მესიჯი
- არ გაუზიაროთ ეს ლინკი სხვებს

მადლობა,
${siteName} გუნდი

კითხვების შემთხვევაში: ${supportEmail}
`;

  // ოპტიმიზებული Mail Options (სპამ-ფილტრების ასათვლელად)
  const mailOptions = {
    from: `"${siteName} Support" <${process.env.EMAIL_USER}>`,
    to: to,
    subject: `[${siteName}] ანგარიშის დადასტურება`, // უკეთესი subject format
    text: textContent,
    html: htmlContent,
    // Anti-spam headers
    headers: {
      'X-Priority': '3', // Normal priority (არა High)
      'X-MSMail-Priority': 'Normal',
      'Importance': 'normal',
      'List-Unsubscribe': `<mailto:${supportEmail}?subject=unsubscribe>`,
      'X-Entity-Ref-ID': `${siteName}-verification-${Date.now()}`,
      'Message-ID': `<${Date.now()}-${Math.random().toString(36).substr(2, 9)}@${siteName.toLowerCase()}>`,
      'X-Mailer': 'NodeMailer',
      'MIME-Version': '1.0',
      'Content-Type': 'multipart/alternative'
    },
    // Reply-to address
    replyTo: supportEmail
  };

  try {
    console.log('ელფოსტის გაგზავნა:', to);
    
    // Rate limiting - ვერიფიკაციის emails-ს შორის მინი პაუზა
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✓ ელფოსტა წარმატებით გაიგზავნა:', info.messageId);
    console.log('Response:', info.response);
    
    return { 
      success: true, 
      messageId: info.messageId,
      response: info.response,
      accepted: info.accepted,
      rejected: info.rejected
    };
    
  } catch (error) {
    console.error('❌ შეცდომა ელფოსტის გაგზავნისას:', error);
    
    // დეტალური error handling
    if (error.code === 'EAUTH') {
      console.error('Authentication failed - შეამოწმეთ App Password');
      throw new Error('ელფოსტის ავტორიზაცია ვერ მოხერხდა');
    } else if (error.code === 'ECONNECTION') {
      console.error('Connection failed - ინტერნეტ კავშირი');
      throw new Error('ქსელთან დაკავშირება ვერ მოხერხდა');
    } else if (error.code === 'EMESSAGE') {
      console.error('Message rejected - შესაძლოა spam-ად იქნას მიჩნეული');
      throw new Error('მესიჯი უარყოფილია');
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

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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
    from: `"${siteName} Team" <${process.env.EMAIL_USER}>`,
    to: to,
    subject: subject,
    text: message,
    html: html || generateSimpleHTML(subject, message, siteName),
    headers: {
      'List-Unsubscribe': `<mailto:${process.env.EMAIL_USER}?subject=unsubscribe>`,
      'X-Priority': '3',
      'X-MSMail-Priority': 'Normal',
      'Importance': 'normal'
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
 * Simple HTML generator
 */
const generateSimpleHTML = (subject, message, siteName) => {
  return `
<!DOCTYPE html>
<html lang="ka">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f8f9fa; color: #333333;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="background-color: #4a90e2; color: white; padding: 25px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 600;">${siteName}</h1>
        </div>
        <div style="padding: 30px;">
            <h2 style="color: #2c3e50; margin-bottom: 20px; font-size: 20px;">${subject}</h2>
            <div style="color: #34495e; line-height: 1.8; font-size: 16px;">${message.replace(/\n/g, '<br>')}</div>
        </div>
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
            <p style="font-size: 14px; color: #6c757d; margin: 0;">
                მადლობა,<br>
                ${siteName} გუნდი
            </p>
        </div>
    </div>
</body>
</html>`;
};

/**
 * Email deliverability test
 */
const testEmailDeliverability = async () => {
  try {
    const transporter = createTransporter();
    const verified = await transporter.verify();
    console.log('✓ SMTP კავშირი წარმატებულია');
    transporter.close();
    return verified;
  } catch (error) {
    console.error('❌ SMTP კავშირის შეცდომა:', error);
    return false;
  }
};

/**
 * Spam score checker (შეიძლება გამოიყენოთ testing-ისთვის)
 */
const checkSpamScore = async (to, subject, content) => {
  // ეს არის testing utility, რომელიც ამოწმებს potential spam triggers
  const spamTriggers = [
    'urgent', 'act now', 'limited time', 'free money', 'guaranteed',
    'no risk', 'call now', 'order now', 'click here immediately',
    'winner', 'congratulations', 'selected', 'exclusive deal'
  ];
  
  const lowerContent = (subject + ' ' + content).toLowerCase();
  const foundTriggers = spamTriggers.filter(trigger => lowerContent.includes(trigger));
  
  if (foundTriggers.length > 0) {
    console.warn('⚠️ Potential spam triggers found:', foundTriggers);
    return {
      score: foundTriggers.length,
      triggers: foundTriggers,
      recommendation: 'Consider rephrasing to avoid spam filters'
    };
  }
  
  return {
    score: 0,
    triggers: [],
    recommendation: 'Content looks good'
  };
};

module.exports = { 
  sendEmail, 
  sendVerificationEmail, 
  testEmailDeliverability,
  checkSpamScore
};