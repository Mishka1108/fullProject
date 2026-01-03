// ============================================
// 📁 models/User.js - User Model with Google OAuth
// ============================================
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  // ============================================
  // BASIC INFORMATION
  // ============================================
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
    required: function() {
      // Password არ არის სავალდებულო თუ Google-ით რეგისტრირდება
      return this.provider === 'local';
    },
    minlength: [6, 'პაროლი უნდა შედგებოდეს მინიმუმ 6 სიმბოლოსგან']
  },

  // ============================================
  // CONTACT INFORMATION
  // ============================================
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
        const birthYear = v.getFullYear();
        const age = today.getFullYear() - birthYear;
        
        // Check if birthday has occurred this year
        const monthDiff = today.getMonth() - v.getMonth();
        const dayDiff = today.getDate() - v.getDate();
        const adjustedAge = (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) ? age - 1 : age;
        
        return v <= today && adjustedAge >= 13 && adjustedAge <= 120;
      },
      message: 'დაბადების თარიღი არასწორია'
    }
  },

  // ============================================
  // PROFILE & VERIFICATION
  // ============================================
  isVerified: { 
    type: Boolean, 
    default: false 
  },
  profileImage: {
    type: String,
    default: "https://i.ibb.co/GvshXkLK/307ce493-b254-4b2d-8ba4-d12c080d6651.jpg"
  },
  avatar: {
    type: String,
    default: "https://i.ibb.co/GvshXkLK/307ce493-b254-4b2d-8ba4-d12c080d6651.jpg"
  },

  // ============================================
  // GOOGLE OAUTH FIELDS
  // ============================================
  googleId: {
    type: String,
    unique: true,
    sparse: true, // Allows null values while maintaining uniqueness
    index: true
  },
  provider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local',
    required: true
  },

  // ============================================
  // ADDITIONAL METADATA
  // ============================================
  lastLogin: {
    type: Date,
    default: Date.now
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  bio: {
    type: String,
    maxlength: [500, 'ბიოგრაფია არ უნდა აღემატებოდეს 500 სიმბოლოს'],
    default: ''
  },
  location: {
    city: String,
    country: String
  }
}, { 
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: {
    transform: function(doc, ret) {
      // Don't expose password in JSON responses
      delete ret.password;
      return ret;
    }
  },
  toObject: {
    transform: function(doc, ret) {
      delete ret.password;
      return ret;
    }
  }
});

// ============================================
// PRE-SAVE MIDDLEWARE
// ============================================

/**
 * Sync avatar and profileImage fields
 */
userSchema.pre('save', function(next) {
  // თუ profileImage შეიცვალა და avatar არ შეცვლილა - sync
  if (this.isModified('profileImage') && !this.isModified('avatar')) {
    this.avatar = this.profileImage;
  }
  // თუ avatar შეიცვალა და profileImage არ შეცვლილა - sync
  if (this.isModified('avatar') && !this.isModified('profileImage')) {
    this.profileImage = this.avatar;
  }
  
  // Update lastLogin on every save
  if (!this.isNew) {
    this.lastLogin = new Date();
  }
  
  next();
});

// ============================================
// VIRTUAL FIELDS
// ============================================

/**
 * Full name virtual field
 */
userSchema.virtual('fullName').get(function() {
  return `${this.name} ${this.secondName}`;
});

/**
 * Age calculation from dateOfBirth
 */
userSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
});

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Check if user registered via Google
 */
userSchema.methods.isGoogleUser = function() {
  return this.provider === 'google';
};

/**
 * Get public profile (safe to send to client)
 */
userSchema.methods.getPublicProfile = function() {
  return {
    id: this._id,
    name: this.name,
    secondName: this.secondName,
    fullName: this.fullName,
    email: this.email,
    phone: this.phone,
    dateOfBirth: this.dateOfBirth,
    age: this.age,
    profileImage: this.profileImage,
    avatar: this.avatar,
    isVerified: this.isVerified,
    provider: this.provider,
    bio: this.bio,
    location: this.location,
    createdAt: this.createdAt,
    role: this.role
  };
};

/**
 * Update last login timestamp
 */
userSchema.methods.updateLastLogin = async function() {
  this.lastLogin = new Date();
  return await this.save();
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * Find user by email (case-insensitive)
 */
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase().trim() });
};

/**
 * Find user by Google ID
 */
userSchema.statics.findByGoogleId = function(googleId) {
  return this.findOne({ googleId });
};

/**
 * Get all verified users
 */
userSchema.statics.getVerifiedUsers = function() {
  return this.find({ isVerified: true, isActive: true });
};

// ============================================
// INDEXES
// ============================================

// Single field indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ phone: 1 }, { sparse: true, unique: true });
userSchema.index({ personalNumber: 1 }, { sparse: true, unique: true });
userSchema.index({ googleId: 1 }, { sparse: true, unique: true });

// Compound indexes
userSchema.index({ isVerified: 1, isActive: 1 });
userSchema.index({ provider: 1, createdAt: -1 });

// Text search index
userSchema.index({ 
  name: 'text', 
  secondName: 'text', 
  email: 'text' 
});

// ============================================
// PRE-REMOVE MIDDLEWARE (Cleanup)
// ============================================
userSchema.pre('remove', async function(next) {
  // Here you can add cleanup logic
  // e.g., delete user's products, messages, etc.
  console.log(`Removing user: ${this.email}`);
  next();
});

module.exports = mongoose.model("User", userSchema);