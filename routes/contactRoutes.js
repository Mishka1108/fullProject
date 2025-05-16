//routes/contactRoutes.js
const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');
const { sendContactFormEmail } = require('../services/emailService');

// POST /api/contact - ახალი საკონტაქტო შეტყობინების შექმნა
router.post('/', async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // შემოწმება, ყველა საჭირო ველი გვაქვს თუ არა
    if (!name || !email || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'გთხოვთ შეავსოთ ყველა სავალდებულო ველი' 
      });
    }

    // შეტყობინების შენახვა მონაცემთა ბაზაში
    const contact = await Contact.create({
      name,
      email,
      message
    });

    // ელფოსტის გაგზავნა
    await sendContactFormEmail({
      name,
      email,
      message
    });

    res.status(201).json({
      success: true,
      data: contact,
      message: 'შეტყობინება წარმატებით გაიგზავნა'
    });
  } catch (error) {
    console.error('შეცდომა შეტყობინების დამუშავებისას:', error);
    
    // სპეციფიკური ვალიდაციის შეცდომების დამუშავება
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        error: messages
      });
    }

    res.status(500).json({
      success: false,
      error: 'სერვერის შეცდომა. გთხოვთ სცადოთ მოგვიანებით.'
    });
  }
});

// GET /api/contact - ყველა შეტყობინების მიღება (ადმინისთვის)
router.get('/', async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: contacts.length,
      data: contacts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'სერვერის შეცდომა. გთხოვთ სცადოთ მოგვიანებით.'
    });
  }
});

module.exports = router;