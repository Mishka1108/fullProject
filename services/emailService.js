const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config(); // გარემოს ცვლადების ჩატვირთვა .env ფაილიდან

// ტრანსპორტერის შექმნა თქვენი ელფოსტის სერვისის პროვაიდერის დეტალების გამოყენებით
// Gmail-ისთვის, სავარაუდოდ დაგჭირდებათ "აპლიკაციის პაროლი" თუ 2FA გააქტიურებული გაქვთ.
// ნახეთ: https://support.google.com/accounts/answer/185833
const transporter = nodemailer.createTransport({
    service: 'gmail', // ან 'outlook', 'yahoo' და ა.შ.
    auth: {
        user: process.env.EMAIL_USER, // თქვენი Gmail მისამართი (მაგ., your_email@gmail.com)
        pass: process.env.EMAIL_PASS, // თქვენი Gmail აპლიკაციის პაროლი
    },
});

// ფუნქცია საკონტაქტო ფორმის ელფოსტის ადმინისტრატორისთვის გასაგზავნად
const sendContactFormEmail = async (formData) => {
    const mailOptions = {
        from: process.env.EMAIL_USER, // გამგზავნის მისამართი
        to: process.env.ADMIN_EMAIL, // თქვენი ელფოსტის მისამართი, სადაც გსურთ მიიღოთ შეტყობინებები
        subject: `ახალი საკონტაქტო ფორმის შეტყობინება: ${formData.name}`,
        html: `
            <p>თქვენ გაქვთ ახალი საკონტაქტო ფორმის შეტყობინება:</p>
            <ul>
                <li><strong>სახელი:</strong> ${formData.name}</li>
                <li><strong>ელფოსტა:</strong> ${formData.email}</li>
                <li><strong>შეტყობინება:</strong> ${formData.message}</li>
            </ul>
            <p>გაგზავნილია: ${new Date().toLocaleString()}</p>
        `,
    };

    await transporter.sendMail(mailOptions);
};

// ფუნქცია მომხმარებლისთვის ავტომატური პასუხის გასაგზავნად
const sendAutoReplyEmail = async (userEmail, userName) => {
    const mailOptions = {
        from: process.env.EMAIL_USER, // თქვენი ელფოსტის მისამართი
        to: userEmail, // მომხმარებლის ელფოსტის მისამართი
        subject: 'გმადლობთ ჩვენთან დაკავშირებისთვის!',
        html: `
            <p>გამარჯობა ${userName},</p>
            <p>გმადლობთ, რომ დაგვიკავშირდით. ჩვენ მივიღეთ თქვენი შეტყობინება და მალე გიპასუხებთ.</p>
            <p>პატივისცემით,</p>
            <p>Market Zone-ის გუნდი</p>
        `,
    };

    await transporter.sendMail(mailOptions);
};

module.exports = {
    sendContactFormEmail,
    sendAutoReplyEmail,
};