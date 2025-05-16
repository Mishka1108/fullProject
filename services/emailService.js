//service/emailService.js
const nodemailer = require('nodemailer');
require('dotenv').config();

// ელფოსტის სერვისის კონფიგურაცია
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ფუნქცია საკონტაქტო ფორმის შეტყობინების გასაგზავნად
const sendContactFormEmail = async (contactData) => {
  const { name, email, message } = contactData;

  const mailOptions = {
    from: `"თქვენი საიტის სახელი" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,
    subject: `ახალი საკონტაქტო შეტყობინება - ${name}`,
    html: `
      <h3>ახალი საკონტაქტო შეტყობინება</h3>
      <p><strong>სახელი:</strong> ${name}</p>
      <p><strong>ელ-ფოსტა:</strong> ${email}</p>
      <p><strong>შეტყობინება:</strong> ${message}</p>
      <hr>
      <p>გაგზავნილია თქვენი საიტის საკონტაქტო ფორმიდან.</p>
    `
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

module.exports = {
  sendContactFormEmail
};