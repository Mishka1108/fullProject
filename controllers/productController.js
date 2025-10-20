// controllers/productController.js - სრული განახლებული ვერსია
const Product = require('../models/product');
const mongoose = require('mongoose');

// ============================================
// HELPER FUNCTION - Generate Slug
// ============================================
const generateSlug = (title) => {
  if (!title) return '';
  
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\u10A0-\u10FF\w\s-]/g, '') // Keep Georgian letters, word chars, spaces, hyphens
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

// ============================================
// GET PRODUCT BY SLUG (4 Strategies)
// ============================================
const getProductBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    
    console.log('🔍 [SLUG SEARCH] Looking for product with slug:', slug);
    
    if (!slug || slug.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Slug is required'
      });
    }

    const decodedSlug = decodeURIComponent(slug);
    console.log('📝 [SLUG SEARCH] Decoded slug:', decodedSlug);

    // ✅ Strategy 1: Find by exact slug match
    let product = await Product.findOne({ slug: decodedSlug })
      .populate('userId', 'name email phone avatar profileImage')
      .exec();

    console.log('🔍 [STRATEGY 1] Exact slug match:', product ? 'FOUND' : 'NOT FOUND');

    // ✅ Strategy 2: Generate slug from decoded and search
    if (!product) {
      console.log('⚠️ [STRATEGY 2] Trying normalized slug...');
      
      const normalizedSearch = generateSlug(decodedSlug);
      console.log('🔄 [STRATEGY 2] Normalized slug:', normalizedSearch);
      
      product = await Product.findOne({ slug: normalizedSearch })
        .populate('userId', 'name email phone avatar profileImage')
        .exec();
      
      console.log('🔍 [STRATEGY 2] Normalized match:', product ? 'FOUND' : 'NOT FOUND');
    }

    // ✅ Strategy 3: Search by title with regex
    if (!product) {
      console.log('⚠️ [STRATEGY 3] Trying title regex...');
      
      const searchRegex = new RegExp(decodedSlug.replace(/-/g, '\\s*'), 'i');
      
      product = await Product.findOne({ title: searchRegex })
        .populate('userId', 'name email phone avatar profileImage')
        .exec();
      
      console.log('🔍 [STRATEGY 3] Title regex match:', product ? 'FOUND' : 'NOT FOUND');
    }

    // ✅ Strategy 4: Manual matching (last resort)
    if (!product) {
      console.log('⚠️ [STRATEGY 4] Last resort - manual matching...');
      
      const allProducts = await Product.find()
        .populate('userId', 'name email phone avatar profileImage')
        .limit(100)
        .lean();
      
      product = allProducts.find(p => {
        const productSlug = generateSlug(p.title);
        const matches = 
          productSlug === decodedSlug || 
          productSlug === slug ||
          generateSlug(decodedSlug) === productSlug ||
          p.title.toLowerCase().includes(decodedSlug.toLowerCase());
        
        if (matches) {
          console.log(`🎯 [STRATEGY 4] Found match: "${p.title}"`);
        }
        return matches;
      });
      
      console.log('🔍 [STRATEGY 4] Manual match:', product ? 'FOUND' : 'NOT FOUND');
    }

    if (!product) {
      console.log('❌ [FINAL] Product not found for slug:', slug);
      return res.status(404).json({
        success: false,
        message: 'პროდუქტი ვერ მოიძებნა',
        searchedSlug: slug,
        decodedSlug: decodedSlug
      });
    }

    console.log('✅ [SUCCESS] Product found:', product.title);

    // Format response with user data
    const formattedProduct = {
      ...(product.toObject ? product.toObject() : product),
      userName: product.userId?.name || product.userName || 'არ არის მითითებული',
      email: product.userId?.email || product.email || 'არ არის მითითებული',
      phone: product.userId?.phone || product.phone || 'არ არის მითითებული',
      userAvatar: product.userId?.avatar || product.userId?.profileImage || product.userAvatar
    };

    res.status(200).json({
      success: true,
      data: formattedProduct,
      product: formattedProduct
    });

  } catch (error) {
    console.error('❌ [ERROR] getProductBySlug:', {
      message: error.message,
      stack: error.stack,
      slug: req.params.slug
    });
    
    res.status(500).json({
      success: false,
      message: 'სერვერის შეცდომა პროდუქტის მოძიებისას',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

// ============================================
// GET PRODUCT BY ID
// ============================================
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🔍 Getting product by ID:', id);
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'არასწორი პროდუქტის ID'
      });
    }
    
    const product = await Product.findById(id)
      .populate('userId', 'name email phone avatar profileImage')
      .exec();
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'პროდუქტი ვერ მოიძებნა'
      });
    }

    const formattedProduct = {
      ...product.toObject(),
      userName: product.userId?.name || product.userName || 'არ არის მითითებული',
      email: product.userId?.email || product.email || 'არ არის მითითებული',
      phone: product.userId?.phone || product.phone || 'არ არის მითითებული',
      userAvatar: product.userId?.avatar || product.userId?.profileImage || product.userAvatar
    };
    
    res.status(200).json({
      success: true,
      product: formattedProduct,
      data: formattedProduct
    });
    
  } catch (error) {
    console.error('❌ Error fetching product by ID:', error);
    
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'პროდუქტი ვერ მოიძებნა'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'სერვერის შეცდომა',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

// ============================================
// GET ALL PRODUCTS (with filters)
// ============================================
const getAllProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const filter = {};
    
    if (req.query.category && req.query.category !== 'all') {
      filter.category = req.query.category;
    }
    
    if (req.query.city && req.query.city !== 'all') {
      filter.cities = { $regex: new RegExp(req.query.city, 'i') };
    }
    
    if (req.query.minPrice || req.query.maxPrice) {
      filter.price = {};
      if (req.query.minPrice) filter.price.$gte = parseInt(req.query.minPrice);
      if (req.query.maxPrice) filter.price.$lte = parseInt(req.query.maxPrice);
    }
    
    if (req.query.year) {
      filter.year = parseInt(req.query.year);
    }
    
    if (req.query.search) {
      filter.$or = [
        { title: { $regex: new RegExp(req.query.search, 'i') } },
        { description: { $regex: new RegExp(req.query.search, 'i') } }
      ];
    }

    let sortOption = { createdAt: -1 };
    
    if (req.query.sortBy) {
      switch (req.query.sortBy) {
        case 'price_asc':
          sortOption = { price: 1 };
          break;
        case 'price_desc':
          sortOption = { price: -1 };
          break;
        case 'title_asc':
          sortOption = { title: 1 };
          break;
        case 'title_desc':
          sortOption = { title: -1 };
          break;
        case 'year_desc':
          sortOption = { year: -1 };
          break;
        case 'year_asc':
          sortOption = { year: 1 };
          break;
        case 'views_desc':
          sortOption = { views: -1 };
          break;
        case 'views_asc':
          sortOption = { views: 1 };
          break;
        case 'popular':
          sortOption = { views: -1, createdAt: -1 };
          break;
        default:
          sortOption = { createdAt: -1 };
      }
    }

    const products = await Product.find(filter)
      .populate('userId', 'name email phone avatar profileImage')
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .lean();

    const enhancedProducts = products.map(product => ({
      ...product,
      userName: product.userId?.name || product.userName || 'არ არის მითითებული',
      email: product.userId?.email || product.email || 'არ არის მითითებული',
      phone: product.userId?.phone || product.phone || 'არ არის მითითებული',
      userAvatar: product.userId?.avatar || product.userId?.profileImage || product.userAvatar
    }));

    const total = await Product.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: enhancedProducts,
      products: enhancedProducts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      },
      filters: {
        category: req.query.category,
        city: req.query.city,
        minPrice: req.query.minPrice,
        maxPrice: req.query.maxPrice,
        year: req.query.year,
        search: req.query.search,
        sortBy: req.query.sortBy
      }
    });
  } catch (error) {
    console.error('❌ Error fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'სერვერის შეცდომა',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

// ============================================
// INCREMENT PRODUCT VIEWS
// ============================================
const incrementProductViews = async (req, res) => {
  try {
    const { id } = req.params;
    const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    const userAgent = req.get('User-Agent');
    
    console.log('📝 Recording view for product:', id);
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'არასწორი პროდუქტის ID'
      });
    }
    
    const product = await Product.findById(id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'პროდუქტი ვერ მოიძებნა'
      });
    }

    const newViewCount = await product.incrementViews(clientIP, userAgent);
    
    console.log('✅ View recorded. New count:', newViewCount);
    
    res.status(200).json({
      success: true,
      message: 'ნახვა დარეგისტრირდა',
      data: {
        productId: product._id,
        title: product.title,
        views: newViewCount,
        totalViews: newViewCount
      }
    });
  } catch (error) {
    console.error('❌ Error incrementing views:', error);
    
    res.status(500).json({
      success: false,
      message: 'ნახვის რეგისტრაციის შეცდომა',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

// ============================================
// GET PRODUCT VIEWS STATISTICS
// ============================================
const getProductViews = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('📊 Fetching view stats for product:', id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'არასწორი პროდუქტის ID'
      });
    }

    const product = await Product.findById(id).select('views viewHistory title');
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'პროდუქტი ვერ მოიძებნა'
      });
    }

    const viewsData = {
      productId: id,
      productTitle: product.title,
      totalViews: product.views || 0,
      viewCount: product.views || 0,
      viewHistory: product.viewHistory || [],
      todayViews: 0,
      weekViews: 0,
      monthViews: 0
    };

    if (product.viewHistory && product.viewHistory.length > 0) {
      const now = new Date();
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      viewsData.todayViews = product.viewHistory.filter(view => 
        new Date(view.viewedAt) >= today
      ).length;

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      viewsData.weekViews = product.viewHistory.filter(view => 
        new Date(view.viewedAt) >= weekAgo
      ).length;

      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      
      viewsData.monthViews = product.viewHistory.filter(view => 
        new Date(view.viewedAt) >= monthAgo
      ).length;
    }

    console.log('✅ View stats:', viewsData);

    res.json({
      success: true,
      data: viewsData,
      ...viewsData,
      message: 'ნახვების სტატისტიკა წარმატებით მოიძებნა'
    });

  } catch (error) {
    console.error('❌ Error fetching product views:', error);
    res.status(500).json({
      success: false,
      message: 'ნახვების მონაცემების მიღების შეცდომა',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

// ============================================
// GET POPULAR PRODUCTS (by views)
// ============================================
const getPopularProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const category = req.query.category;
    
    let filter = {};
    if (category && category !== 'all') {
      filter.category = category;
    }
    
    const popularProducts = await Product.find(filter)
      .populate('userId', 'name email phone avatar profileImage')
      .sort({ views: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    const enhancedProducts = popularProducts.map(product => ({
      ...product,
      userName: product.userId?.name || product.userName,
      email: product.userId?.email || product.email,
      phone: product.userId?.phone || product.phone,
      userAvatar: product.userId?.avatar || product.userId?.profileImage || product.userAvatar
    }));

    res.status(200).json({
      success: true,
      data: enhancedProducts,
      message: `ტოპ ${enhancedProducts.length} პოპულარული პროდუქტი`
    });
  } catch (error) {
    console.error('❌ Error fetching popular products:', error);
    res.status(500).json({
      success: false,
      message: 'სერვერის შეცდომა',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

// ============================================
// GET VIEWS STATISTICS (all products)
// ============================================
const getViewsStatistics = async (req, res) => {
  try {
    const stats = await Product.getViewsStats();
    
    const categoryStats = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          totalViews: { $sum: '$views' },
          avgViews: { $avg: '$views' },
          productCount: { $sum: 1 }
        }
      },
      {
        $sort: { totalViews: -1 }
      }
    ]);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const recentViews = await Product.aggregate([
      { $unwind: '$viewHistory' },
      { $match: { 'viewHistory.viewedAt': { $gte: weekAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$viewHistory.viewedAt' },
            month: { $month: '$viewHistory.viewedAt' },
            day: { $dayOfMonth: '$viewHistory.viewedAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        overall: stats,
        byCategory: categoryStats,
        recentViews: recentViews
      }
    });
  } catch (error) {
    console.error('❌ Error fetching views statistics:', error);
    res.status(500).json({
      success: false,
      message: 'სერვერის შეცდომა',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

// ============================================
// GET USER PRODUCTS
// ============================================
const getUserProducts = async (req, res) => {
  try {
    const products = await Product.findByUserId(req.user.id)
      .populate('userId', 'name email phone avatar profileImage');
      
    res.status(200).json({
      success: true,
      data: products,
      count: products.length
    });
  } catch (error) {
    console.error('❌ Error fetching user products:', error);
    res.status(500).json({
      success: false,
      message: 'სერვერის შეცდომა',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

// ============================================
// ADD PRODUCT
// ============================================
const addProduct = async (req, res) => {
  try {
    const images = [];
    
    console.log('📁 Processing uploaded files...');
    console.log('Files:', req.files);
    console.log('Body:', req.body);
    
    if (req.files && req.files.length > 0) {
      console.log(`📸 Processing ${req.files.length} files...`);
      
      if (req.files[0].path) {
        req.files.forEach((file, index) => {
          console.log(`📎 File ${index + 1}: ${file.originalname} -> ${file.path}`);
          images.push(file.path);
        });
      }
      else if (req.files[0].buffer) {
        req.files.forEach((file, index) => {
          const base64Image = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
          images.push(base64Image);
        });
      }
    }

    const { title, cities, category, email, year, phone, price, description } = req.body;
    
    if (!title || !cities || !category || !email || !year || !phone || !price || !description) {
      return res.status(400).json({
        success: false,
        message: 'ყველა სავალდებულო ველი უნდა იყოს შევსებული',
        receivedFields: Object.keys(req.body)
      });
    }

    const productData = {
      userId: req.user.id,
      title: title.trim(),
      cities: cities.trim(),
      category: category.trim(),
      email: email.trim().toLowerCase(),
      year: parseInt(year),
      phone: phone.trim(),
      price: parseFloat(price),
      description: description.trim(),
      images: images.length > 0 ? images : undefined,
      views: 0
    };

    // Get user avatar
    try {
      const User = require('../models/User');
      const user = await User.findById(req.user.id).select('name avatar profileImage');
      
      if (user) {
        productData.userName = user.name;
        productData.userAvatar = user.avatar || user.profileImage;
      }
    } catch (error) {
      console.warn('⚠️ Could not fetch user avatar:', error.message);
    }

    console.log('💾 Creating product...');

    const product = new Product(productData);
    await product.save();

    await product.populate('userId', 'name email phone avatar profileImage');

    console.log('✅ Product created:', product.title);

    res.status(201).json({
      success: true,
      data: product,
      message: 'პროდუქტი წარმატებით დაემატა'
    });
  } catch (error) {
    console.error('❌ Error adding product:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'ვალიდაციის შეცდომა',
        errors: errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'პროდუქტის დამატება ვერ მოხერხდა',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

// ============================================
// UPDATE PRODUCT
// ============================================
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'პროდუქტი ვერ მოიძებნა'
      });
    }

    if (product.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'არ გაქვთ ავტორიზაცია ამ პროდუქტის შესაცვლელად'
      });
    }

    if (req.files && req.files.length > 0) {
      const newImages = [];
      req.files.forEach(file => {
        if (file.path) {
          newImages.push(file.path);
        } else if (file.buffer) {
          const base64Image = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
          newImages.push(base64Image);
        }
      });
      req.body.images = newImages;
    }

    const allowedFields = ['title', 'cities', 'category', 'email', 'year', 'phone', 'price', 'description', 'images'];
    const updateData = {};
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'year') {
          updateData[field] = parseInt(req.body[field]);
        } else if (field === 'price') {
          updateData[field] = parseFloat(req.body[field]);
        } else if (field === 'email') {
          updateData[field] = req.body[field].trim().toLowerCase();
        } else if (typeof req.body[field] === 'string') {
          updateData[field] = req.body[field].trim();
        } else {
          updateData[field] = req.body[field];
        }
      }
    });

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('userId', 'name email phone avatar profileImage');

    res.status(200).json({
      success: true,
      data: updatedProduct,
      message: 'პროდუქტი წარმატებით განახლდა'
    });
  } catch (error) {
    console.error('❌ Error updating product:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'ვალიდაციის შეცდომა',
        errors: errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'პროდუქტის განახლება ვერ მოხერხდა',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

// ============================================
// DELETE PRODUCT
// ============================================
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'პროდუქტი ვერ მოიძებნა'
      });
    }

    if (product.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'არ გაქვთ ავტორიზაცია ამ პროდუქტის წასაშლელად'
      });
    }

    await Product.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'პროდუქტი წარმატებით წაიშალა'
    });
  } catch (error) {
    console.error('❌ Error deleting product:', error);
    
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'პროდუქტი ვერ მოიძებნა'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'სერვერის შეცდომა',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

// ============================================
// GET CATEGORY STATISTICS
// ============================================
const getCategoryStats = async (req, res) => {
  try {
    const stats = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
          totalViews: { $sum: '$views' },
          avgViews: { $avg: '$views' }
        }
      },
      {
        $sort: { totalViews: -1 }
      }
    ]);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Error fetching category stats:', error);
    res.status(500).json({
      success: false,
      message: 'სერვერის შეცდომა'
    });
  }
};

// ============================================
// SEARCH PRODUCTS
// ============================================
const searchProducts = async (req, res) => {
  try {
    const { title, slug, category, city } = req.query;
    const filter = {};

    if (title) {
      filter.title = { $regex: new RegExp(title, 'i') };
    }

    if (slug) {
      filter.slug = slug;
    }

    if (category) {
      filter.category = category;
    }

    if (city) {
      filter.cities = { $regex: new RegExp(city, 'i') };
    }

    const results = await Product.find(filter)
      .populate('userId', 'name email phone avatar profileImage')
      .limit(50)
      .lean();

    const enhancedResults = results.map(product => ({
      ...product,
      userName: product.userId?.name || product.userName,
      email: product.userId?.email || product.email,
      phone: product.userId?.phone || product.phone,
      userAvatar: product.userId?.avatar || product.userId?.profileImage || product.userAvatar
    }));

    res.status(200).json({
      success: true,
      data: enhancedResults,
      count: enhancedResults.length
    });
  } catch (error) {
    console.error('❌ Error searching products:', error);
    res.status(500).json({
      success: false,
      message: 'ძებნის შეცდომა',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

// ============================================
// EXPORTS
// ============================================
module.exports = {
  getProductBySlug,
  getProductById,
  getAllProducts,
  incrementProductViews,
  getProductViews,
  getPopularProducts,
  getViewsStatistics,
  getUserProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  getCategoryStats,
  searchProducts
};