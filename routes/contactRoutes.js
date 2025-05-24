//routes/contactRoutes.js
const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');
const { sendContactFormEmail, sendAutoReplyEmail } = require('../services/emailService');

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

    // ელფოსტის ვალიდაცია
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        error: 'გთხოვთ მიუთითოთ სწორი ელფოსტის მისამართი' 
      });
    }

    // შეტყობინების შენახვა მონაცემთა ბაზაში
    const contact = await Contact.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      message: message.trim()
    });

    // ელფოსტის გაგზავნის მცდელობა
    try {
      // ელფოსტის გაგზავნა ადმინისთვის
      await sendContactFormEmail({
        name: contact.name,
        email: contact.email,
        message: contact.message
      });

      // ავტომატური პასუხის გაგზავნა მომხმარებლისთვის (არასავალდებულო)
      try {
        await sendAutoReplyEmail(contact.email, contact.name);
      } catch (autoReplyError) {
        console.warn('ავტომატური პასუხის გაგზავნის შეცდომა:', autoReplyError.message);
        // ავტომატური პასუხის შეცდომა არ უნდა შეაფერხოს მთავარი პროცესი
      }

      res.status(201).json({
        success: true,
        data: {
          id: contact._id,
          name: contact.name,
          email: contact.email,
          message: contact.message,
          createdAt: contact.createdAt
        },
        message: 'შეტყობინება წარმატებით გაიგზავნა'
      });

    } catch (emailError) {
      console.error('ელფოსტის გაგზავნის შეცდომა:', emailError);
      
      // მიუხედავად ელფოსტის შეცდომისა, შეტყობინება ბაზაში შენახულია
      res.status(201).json({
        success: true,
        data: {
          id: contact._id,
          name: contact.name,
          email: contact.email,
          message: contact.message,
          createdAt: contact.createdAt
        },
        message: 'შეტყობინება შენახულია, მაგრამ ელფოსტის გაგზავნისას მოხდა შეცდომა. ჩვენი გუნდი მალე შეგეხებათ.',
        warning: 'ელფოსტის გაგზავნის პრობლემა'
      });
    }

  } catch (error) {
    console.error('შეცდომა შეტყობინების დამუშავებისას:', error);
    
    // სპეციფიკური ვალიდაციის შეცდომების დამუშავება
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        error: messages.join(', ')
      });
    }

    // MongoDB duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'ამ ელფოსტით უკვე გაგზავნილია შეტყობინება'
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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const contacts = await Contact.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Contact.countDocuments();
    
    res.status(200).json({
      success: true,
      count: contacts.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: contacts
    });
  } catch (error) {
    console.error('შეცდომა შეტყობინებების მიღებისას:', error);
    res.status(500).json({
      success: false,
      error: 'სერვერის შეცდომა. გთხოვთ სცადოთ მოგვიანებით.'
    });
  }
});

// GET /api/contact/:id - კონკრეტული შეტყობინების მიღება
router.get('/:id', async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'შეტყობინება ვერ მოიძებნა'
      });
    }
    
    res.status(200).json({
      success: true,
      data: contact
    });
  } catch (error) {
    console.error('შეცდომა შეტყობინების მიღებისას:', error);
    res.status(500).json({
      success: false,
      error: 'სერვერის შეცდომა'
    });
  }
});

// DELETE /api/contact/:id - შეტყობინების წაშლა (ადმინისთვის)
router.delete('/:id', async (req, res) => {
  try {
    const contact = await Contact.findByIdAndDelete(req.params.id);
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'შეტყობინება ვერ მოიძებნა'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'შეტყობინება წარმატებით წაიშალა'
    });
  } catch (error) {
    console.error('შეცდომა შეტყობინების წაშლისას:', error);
    res.status(500).json({
      success: false,
      error: 'სერვერის შეცდომა'
    });
  }
});

module.exports = router;