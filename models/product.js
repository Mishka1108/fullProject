// models/product.js - სრული განახლებული ვერსია
const mongoose = require("mongoose");

// ============================================
// SLUG GENERATOR FUNCTION
// ============================================
function generateSlug(title) {
  if (!title) return '';
  
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\u10A0-\u10FF\w\s-]/g, '') // Keep Georgian letters, word chars, spaces, hyphens
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ============================================
// PRODUCT SCHEMA
// ============================================
const productSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'სათაური სავალდებულოა'],
    trim: true,
    maxlength: [200, 'სათაური არ უნდა აღემატებოდეს 200 სიმბოლოს']
  },
  slug: {
    type: String,
    unique: true,
    trim: true,
    lowercase: true,
    index: true
  },
  cities: {
    type: String,
    required: [true, 'ქალაქი სავალდებულოა'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'კატეგორია სავალდებულოა'],
    trim: true,
    index: true
  },
  email: {
    type: String,
    required: [true, 'ელ. ფოსტა სავალდებულოა'],
    trim: true,
    lowercase: true
  },
  year: {
    type: Number,
    required: [true, 'წელი სავალდებულოა'],
    min: [2000, 'წელი არ შეიძლება იყოს 2000-ზე ნაკლები'],
    max: [new Date().getFullYear(), `წელი არ შეიძლება იყოს ${new Date().getFullYear()}-ზე მეტი`]
  },
  phone: {
    type: String,
    required: [true, 'ტელეფონი სავალდებულოა'],
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'ფასი სავალდებულოა'],
    min: [0, 'ფასი არ შეიძლება იყოს უარყოფითი']
  },
  description: {
    type: String,
    required: [true, 'აღწერა სავალდებულოა'],
    trim: true,
    maxlength: [2000, 'აღწერა არ უნდა აღემატებოდეს 2000 სიმბოლოს']
  },
  
  // ============================================
  // USER INFO FIELDS
  // ============================================
  userName: {
    type: String,
    required: false
  },
  userAvatar: {
    type: String,
    required: false
  },
  
  // ============================================
  // IMAGES
  // ============================================
  images: [{
    type: String,
    required: false
  }],
  image: {
    type: String,
    required: false
  },
  
  // ============================================
  // VIEW TRACKING
  // ============================================
  views: {
    type: Number,
    default: 0,
    min: 0,
    index: true
  },
  viewHistory: [{
    viewedAt: {
      type: Date,
      default: Date.now
    },
    ipAddress: {
      type: String,
      required: false
    },
    userAgent: {
      type: String,
      required: false
    }
  }],
  lastViewedAt: {
    type: Date,
    default: null
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ============================================
// INDEXES FOR PERFORMANCE
// ============================================
productSchema.index({ userId: 1, createdAt: -1 });
productSchema.index({ category: 1 });
productSchema.index({ cities: 1 });
productSchema.index({ price: 1 });
productSchema.index({ slug: 1 }, { unique: true });
productSchema.index({ views: -1 });
productSchema.index({ title: 'text', description: 'text' });
productSchema.index({ createdAt: -1 });

// ============================================
// PRE-SAVE MIDDLEWARE
// ============================================
productSchema.pre('save', async function(next) {
  try {
    // Generate unique slug
    if (this.isModified('title') || !this.slug) {
      let baseSlug = generateSlug(this.title);
      let uniqueSlug = baseSlug;
      let counter = 1;
      
      while (await mongoose.model('Product').findOne({ 
        slug: uniqueSlug, 
        _id: { $ne: this._id } 
      })) {
        uniqueSlug = `${baseSlug}-${counter}`;
        counter++;
      }
      
      this.slug = uniqueSlug;
      console.log('✅ Generated slug:', this.slug);
    }
    
    // Validate images
    if ((!this.images || this.images.length === 0) && !this.image) {
      const error = new Error('მინიმუმ ერთი სურათი აუცილებელია');
      error.name = 'ValidationError';
      return next(error);
    }
    
    // Set main image if not set
    if (this.image && (!this.images || this.images.length === 0)) {
      this.images = [this.image];
    } else if (!this.image && this.images && this.images.length > 0) {
      this.image = this.images[0];
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// ============================================
// VIRTUAL FIELDS
// ============================================
productSchema.virtual('primaryImage').get(function() {
  if (this.images && this.images.length > 0) {
    return this.images[0];
  }
  return this.image || 'assets/images/placeholder.jpg';
});

productSchema.virtual('allImages').get(function() {
  const images = [];
  
  if (this.image) images.push(this.image);
  
  if (this.images && this.images.length > 0) {
    this.images.forEach(img => {
      if (img && !images.includes(img)) {
        images.push(img);
      }
    });
  }
  
  return images.length > 0 ? images : ['assets/images/placeholder.jpg'];
});

productSchema.virtual('isPopular').get(function() {
  return this.views > 100;
});

productSchema.virtual('viewsDisplay').get(function() {
  if (this.views >= 1000000) {
    return Math.floor(this.views / 1000000) + 'M';
  }
  if (this.views >= 1000) {
    return Math.floor(this.views / 1000) + 'K';
  }
  return this.views.toString();
});

// ============================================
// STATIC METHODS
// ============================================
productSchema.statics.findBySlug = function(slug) {
  return this.findOne({ slug: slug });
};

productSchema.statics.findByUserId = function(userId) {
  return this.find({ userId }).sort({ createdAt: -1 });
};

productSchema.statics.findByCategory = function(category) {
  return this.find({ category }).sort({ createdAt: -1 });
};

productSchema.statics.findByCity = function(city) {
  return this.find({ cities: { $regex: new RegExp(city, 'i') } }).sort({ createdAt: -1 });
};

productSchema.statics.findMostViewed = function(limit = 10) {
  return this.find()
    .populate('userId', 'name email phone avatar profileImage')
    .sort({ views: -1 })
    .limit(limit);
};

productSchema.statics.getViewsStats = async function() {
  try {
    const stats = await this.aggregate([
      {
        $group: {
          _id: null,
          totalViews: { $sum: '$views' },
          avgViews: { $avg: '$views' },
          maxViews: { $max: '$views' },
          minViews: { $min: '$views' },
          totalProducts: { $sum: 1 }
        }
      }
    ]);
    
    return stats[0] || {
      totalViews: 0,
      avgViews: 0,
      maxViews: 0,
      minViews: 0,
      totalProducts: 0
    };
  } catch (error) {
    console.error('Error getting views stats:', error);
    throw error;
  }
};

// ============================================
// INSTANCE METHODS
// ============================================
productSchema.methods.incrementViews = async function(ipAddress = null, userAgent = null) {
  try {
    this.views += 1;
    this.lastViewedAt = new Date();
    
    // Add to view history with limit
    if (ipAddress || userAgent) {
      if (this.viewHistory.length >= 100) {
        this.viewHistory = this.viewHistory.slice(-99);
      }
      
      this.viewHistory.push({
        viewedAt: new Date(),
        ipAddress: ipAddress,
        userAgent: userAgent
      });
    }
    
    await this.save();
    console.log(`✅ Views incremented for "${this.title}": ${this.views}`);
    return this.views;
  } catch (error) {
    console.error('Error incrementing views:', error);
    throw error;
  }
};

productSchema.methods.getOwnerInfo = async function() {
  const User = mongoose.model('User');
  const user = await User.findById(this.userId).select('name secondName profileImage avatar');
  return {
    name: user ? `${user.name} ${user.secondName || ''}`.trim() : 'უცნობი მომხმარებელი',
    profileImage: user ? (user.profileImage || user.avatar) : null,
    avatar: user ? (user.avatar || user.profileImage) : null
  };
};

productSchema.methods.getTodayViews = function() {
  if (!this.viewHistory || this.viewHistory.length === 0) return 0;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return this.viewHistory.filter(view => 
    new Date(view.viewedAt) >= today
  ).length;
};

productSchema.methods.getWeekViews = function() {
  if (!this.viewHistory || this.viewHistory.length === 0) return 0;
  
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  return this.viewHistory.filter(view => 
    new Date(view.viewedAt) >= weekAgo
  ).length;
};

productSchema.methods.getMonthViews = function() {
  if (!this.viewHistory || this.viewHistory.length === 0) return 0;
  
  const monthAgo = new Date();
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  
  return this.viewHistory.filter(view => 
    new Date(view.viewedAt) >= monthAgo
  ).length;
};

// ============================================
// EXPORT MODEL
// ============================================
module.exports = mongoose.model("Product", productSchema);