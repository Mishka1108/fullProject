// createAdmin.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');

// მონაცემები პირველი ადმინისთვის
const adminData = {
  username: 'admin',
  email: 'admin@example.com',
  password: 'lika', // ეს პაროლი აუცილებლად უნდა შეიცვალოს შემდეგ!
  role: 'admin'
};

// MongoDB-სთან დაკავშირება
const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB-სთან დაკავშირება წარმატებულია');

    // ვამოწმებთ არსებობს თუ არა უკვე ადმინი
    const existingAdmin = await Admin.findOne({ 
      $or: [
        { username: adminData.username },
        { email: adminData.email }
      ]
    });

    if (existingAdmin) {
      console.log('ადმინი უკვე არსებობს!');
      await mongoose.connection.close();
      return;
    }

    // პაროლის დაჰეშვა
    const hashedPassword = await bcrypt.hash(adminData.password, 10);

    // ადმინის შექმნა
    const admin = new Admin({
      username: adminData.username,
      email: adminData.email,
      password: hashedPassword,
      role: adminData.role
    });

    await admin.save();
    console.log('ადმინი წარმატებით შეიქმნა!');
    console.log(`სახელი: ${adminData.username}`);
    console.log(`ელ-ფოსტა: ${adminData.email}`);
    console.log(`პაროლი: ${adminData.password} (შეცვალეთ ეს პაროლი საჭიროებისამებრ)`);

  } catch (error) {
    console.error('შეცდომა ადმინის შექმნისას:', error);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB კავშირი დახურულია');
  }
};

createAdmin();