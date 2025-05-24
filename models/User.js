//models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'სახელი სავალდებულოა'],
    trim: true,
    minlength: [2, 'სახელი უნდა შედგებოდეს მინიმუმ 2 სიმბოლოსგან'],
    maxlength: [50, 'სახელი არ უნდა აღემატებოდეს 50 სიმბოლოს']
  },
  secondName: {
    type: String,
    required: [true, 'გვარი სავალდებულოა'],
    trim: true,
    minlength: [2, 'გვარი უნდა შედგებოდეს მინიმუმ 2 სიმბოლოსგან'],
    maxlength: [50, 'გვარი არ უნდა აღემატებოდეს 50 სიმბოლოს']
  },
  phone: {
    type: String,
    sparse: true, // ეს საშუალებას აძლევს null/undefined მნიშვნელობებს, მაგრამ unique-ს ინარჩუნებს არ-null მნიშვნელობებისთვის
    unique: true,
    validate: {
      validator: function(v) {
        // თუ phone არ არის მითითებული, ვალიდაცია გაიარება
        if (!v) return true;
        // ტელეფონი უნდა იყოს რიცხვები და შეიძლება დაიწყოს +ით
        return /^\+?[0-9]{9,15}$/.test(v.toString());
      },
      message: 'ტელეფონის ნომერი არასწორია'
    }
  },
  personalNumber: {
    type: String,
    sparse: true,
    unique: true,
    validate: {
      validator: function(v) {
        // თუ personalNumber არ არის მითითებული, ვალიდაცია გაიარება
        if (!v) return true;
        // პირადი ნომერი უნდა იყოს 11 ციფრი (საქართველოსთვის)
        return /^[0-9]{11}$/.test(v.toString());
      },
      message: 'პირადი ნომერი უნდა შედგებოდეს 11 ციფრისგან'
    }
  },
  dateOfBirth: {
    type: Date,
    validate: {
      validator: function(v) {
        if (!v) return true; // Optional field
        const today = new Date();
        const age = today.getFullYear() - v.getFullYear();
        return v <= today && age >= 13 && age <= 120;
      },
      message: 'დაბადების თარიღი არასწორია'
    }
  },
  email: { 
    type: String, 
    required: [true, 'ელ-ფოსტა სავალდებულოა'], 
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^\S+@\S+\.\S+$/.test(v);
      },
      message: 'ელ-ფოსტის ფორმატი არასწორია'
    }
  },
  password: { 
    type: String, 
    required: [true, 'პაროლი სავალდებულოა'],
    minlength: [6, 'პაროლი უნდა შედგებოდეს მინიმუმ 6 სიმბოლოსგან']
  },
  isVerified: { 
    type: Boolean, 
    default: false 
  },
  profileImage: {
    type: String,
    default: "https://i.ibb.co/GvshXkLK/307ce493-b254-4b2d-8ba4-d12c080d6651.jpg"
  }
}, { 
  timestamps: true,
  // ეს საშუალებას აძლევს JSON-ში გადაქცევისას ზოგიერთი ველის დამალვას
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      return ret;
    }
  }
});

// Index-ები უნიკურობისთვის (sparse index-ები null მნიშვნელობებს ტოვებს)
userSchema.index({ phone: 1 }, { sparse: true });
userSchema.index({ personalNumber: 1 }, { sparse: true });

module.exports = mongoose.model("User", userSchema);