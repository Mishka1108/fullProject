// 📁 models/Message.js
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  senderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true,
    index: true
  },
  receiverId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true,
    index: true
  },
  content: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 5000
  },
  read: { 
    type: Boolean, 
    default: false,
    index: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    default: null
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file'],
    default: 'text'
  }
}, { 
  timestamps: true
});

// ✅ Compound ინდექსები
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
messageSchema.index({ receiverId: 1, read: 1 });

module.exports = mongoose.model("Message", messageSchema);