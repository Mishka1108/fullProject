// models/product.js - ნახვების ფუნქციით განახლებული
const mongoose = require("mongoose");

// Slug generator function
function generateSlug(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\u10A0-\u10FF\w\s-]/g, '') // ქართული ასოები + ლათინური + რიცხვები
    .replace(/\s+/g, '-') // spaces -> hyphens
    .replace(/-+/g, '-') // multiple hyphens -> single hyphen
    .replace(/^-|-$/g, ''); // remove leading/trailing hyphens
}

const productSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    unique: true,
    trim: true
  },
  cities: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  year: {
    type: Number,
    required: true,
    min: 2000,
    max: new Date().getFullYear()
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  images: [{
    type: String,
    required: false
  }],
  image: {
    type: String,
    required: false
  },
  // ✅ ნახვების ველი
  views: {
    type: Number,
    default: 0,
    min: 0
  },
  // ✅ ნახვების ისტორია (optional - analytics-ისთვის)
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
  // ✅ ლასტ ნახვის თარიღი
  lastViewedAt: {
    type: Date,
    default: null
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Pre-save middleware
productSchema.pre('save', async function(next) {
  try {
    // Slug generation
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
    }
    
    // Image validation
    if ((!this.images || this.images.length === 0) && !this.image) {
      const error = new Error('მინიმუმ ერთი სურათი აუცილებელია');
      error.name = 'ValidationError';
      return next(error);
    }
    
    if (this.image && (!this.images || this.images.length === 0)) {
      this.images = [this.image];
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Virtual fields
productSchema.virtual('primaryImage').get(function() {
  if (this.images && this.images.length > 0) {
    return this.images[0];
  }
  return this.image;
});

productSchema.virtual('allImages').get(function() {
  if (this.images && this.images.length > 0) {
    return this.images;
  }
  return this.image ? [this.image] : [];
});

// ✅ Virtual field - ნახვების სტატისტიკისთვის
productSchema.virtual('isPopular').get(function() {
  return this.views > 100; // 100+ ნახვა = პოპულარული
});

productSchema.virtual('viewsDisplay').get(function() {
  if (this.views >= 1000) {
    return Math.floor(this.views / 1000) + 'K';
  }
  return this.views.toString();
});

// Index-ები
productSchema.index({ userId: 1, createdAt: -1 });
productSchema.index({ category: 1 });
productSchema.index({ cities: 1 });
productSchema.index({ price: 1 });
productSchema.index({ slug: 1 });
productSchema.index({ views: -1 }); // ✅ ნახვების index პოპულარული პროდუქტებისთვის
productSchema.index({ title: 'text', description: 'text' });

// Static methods
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

// ✅ ნახვების ტოპ პროდუქტები
productSchema.statics.findMostViewed = function(limit = 10) {
  return this.find()
    .populate('userId', 'name secondName profileImage')
    .sort({ views: -1 })
    .limit(limit);
};

// ✅ ნახვების increment მეთოდი
productSchema.methods.incrementViews = async function(ipAddress = null, userAgent = null) {
  try {
    // ძირითადი views counter
    this.views += 1;
    this.lastViewedAt = new Date();
    
    // ✅ ნახვების ისტორიის დამატება (optional)
    if (ipAddress || userAgent) {
      // ლიმიტი ისტორიაზე - ბოლო 100 ნახვა
      if (this.viewHistory.length >= 100) {
        this.viewHistory = this.viewHistory.slice(-99); // Keep last 99
      }
      
      this.viewHistory.push({
        viewedAt: new Date(),
        ipAddress: ipAddress,
        userAgent: userAgent
      });
    }
    
    await this.save();
    return this.views;
  } catch (error) {
    console.error('Error incrementing views:', error);
    throw error;
  }
};

// ✅ ნახვების სტატისტიკა
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

// Instance method
productSchema.methods.getOwnerInfo = async function() {
  const User = mongoose.model('User');
  const user = await User.findById(this.userId).select('name secondName profileImage');
  return {
    name: user ? `${user.name} ${user.secondName}` : 'უცნობი მომხმარებელი',
    profileImage: user ? user.profileImage : null
  };
};

module.exports = mongoose.model("Product", productSchema);