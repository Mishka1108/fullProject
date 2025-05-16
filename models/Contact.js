//models/Contact.js
const mongoose = require('mongoose');

const ContactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'სახელი სავალდებულოა']
  },
  email: {
    type: String,
    required: [true, 'ელ-ფოსტა სავალდებულოა'],
    match: [/^\S+@\S+\.\S+$/, 'გთხოვთ მიუთითოთ სწორი ელ-ფოსტის მისამართი']
  },
  message: {
    type: String,
    required: [true, 'შეტყობინება სავალდებულოა']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Contact', ContactSchema);