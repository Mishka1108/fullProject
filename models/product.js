// models/product.js - მთლიანი კოდი slug-ით
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
  // ✅ SLUG ველის დამატება
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
  // მრავალი სურათისთვის images array
  images: [{
    type: String,
    required: false
  }],
  // backward compatibility-სთვის ძველი image ველი
  image: {
    type: String,
    required: false
  }
}, { 
  timestamps: true,
  // virtual fields-ისთვის
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ✅ Pre-save middleware - slug-ის ავტომატური გენერაცია
productSchema.pre('save', async function(next) {
  try {
    // Slug generation
    if (this.isModified('title') || !this.slug) {
      let baseSlug = generateSlug(this.title);
      let uniqueSlug = baseSlug;
      let counter = 1;
      
      // Check for unique slug
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
    
    // თუ images array არ არის, მაგრამ image ველი არის, გადავიტანოთ images array-ში
    if (this.image && (!this.images || this.images.length === 0)) {
      this.images = [this.image];
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Virtual field - თუ images array ცარიელია, დაბრუნდეს image ველი
productSchema.virtual('primaryImage').get(function() {
  if (this.images && this.images.length > 0) {
    return this.images[0];
  }
  return this.image;
});

// Virtual field - ყველა სურათის დასაბრუნებლად
productSchema.virtual('allImages').get(function() {
  if (this.images && this.images.length > 0) {
    return this.images;
  }
  return this.image ? [this.image] : [];
});

// Index-ები პერფორმანსისთვის
productSchema.index({ userId: 1, createdAt: -1 });
productSchema.index({ category: 1 });
productSchema.index({ cities: 1 });
productSchema.index({ price: 1 });
productSchema.index({ slug: 1 }); // ✅ Slug index
productSchema.index({ title: 'text', description: 'text' });

// ✅ Static method - slug-ით პროდუქტის ძებნა
productSchema.statics.findBySlug = function(slug) {
  return this.findOne({ slug: slug });
};

// Static method - user-ის პროდუქტების მიღება
productSchema.statics.findByUserId = function(userId) {
  return this.find({ userId }).sort({ createdAt: -1 });
};

// Static method - კატეგორიით ძებნა
productSchema.statics.findByCategory = function(category) {
  return this.find({ category }).sort({ createdAt: -1 });
};

// Static method - ქალაქით ძებნა
productSchema.statics.findByCity = function(city) {
  return this.find({ cities: { $regex: new RegExp(city, 'i') } }).sort({ createdAt: -1 });
};

// Instance method - პროდუქტის მფლობელთან დაკავშირება
productSchema.methods.getOwnerInfo = async function() {
  const User = mongoose.model('User');
  const user = await User.findById(this.userId).select('name secondName profileImage');
  return {
    name: user ? `${user.name} ${user.secondName}` : 'უცნობი მომხმარებელი',
    profileImage: user ? user.profileImage : null
  };
};

module.exports = mongoose.model("Product", productSchema);