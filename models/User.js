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
    sparse: true,
    unique: true,
    validate: {
      validator: function(v) {
        if (!v) return true;
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
        if (!v) return true;
        return /^[0-9]{11}$/.test(v.toString());
      },
      message: 'პირადი ნომერი უნდა შედგებოდეს 11 ციფრისგან'
    }
  },
  dateOfBirth: {
    type: Date,
    validate: {
      validator: function(v) {
        if (!v) return true;
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
  },
  // ✅✅✅ ახალი: avatar ველი (profileImage-ის alias) ✅✅✅
  avatar: {
    type: String,
    default: "https://i.ibb.co/GvshXkLK/307ce493-b254-4b2d-8ba4-d12c080d6651.jpg"
  }
}, { 
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      return ret;
    }
  }
});

// ✅✅✅ Virtual field - ავტომატურად sync avatar და profileImage ✅✅✅
userSchema.pre('save', function(next) {
  // თუ profileImage შეიცვალა და avatar არ შეცვლილა - sync
  if (this.isModified('profileImage') && !this.isModified('avatar')) {
    this.avatar = this.profileImage;
  }
  // თუ avatar შეიცვალა და profileImage არ შეცვლილა - sync
  if (this.isModified('avatar') && !this.isModified('profileImage')) {
    this.profileImage = this.avatar;
  }
  next();
});

// Index-ები უნიკურობისთვის
userSchema.index({ phone: 1 }, { sparse: true });
userSchema.index({ personalNumber: 1 }, { sparse: true });

module.exports = mongoose.model("User", userSchema);