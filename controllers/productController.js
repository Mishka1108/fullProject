// controllers/productController.js - მთლიანი კოდი
const Product = require('../models/product');

// ✅ SLUG-ით პროდუქტის მიღება
const getProductBySlug = async (req, res) => {
  try {
    const originalSlug = req.params.slug;
    const slug = decodeURIComponent(originalSlug);
    
    console.log('🔍 Original slug from URL:', originalSlug);
    console.log('🔍 Decoded slug:', slug);
    console.log('🔍 Slug encoding test:', encodeURIComponent(slug));
    
    const product = await Product.findBySlug(slug).populate('userId', 'name secondName profileImage');
    
    if (!product) {
      console.log('❌ Product not found with slug:', slug);
      
      // ✅ დამატებითი ძებნა title-ით (fallback)
      console.log('🔄 Trying to find by title...');
      const productByTitle = await Product.findOne({ 
        title: { $regex: new RegExp(`^${slug.replace(/[-_]/g, '\\s*')}$`, 'i') }
      }).populate('userId', 'name secondName profileImage');
      
      if (productByTitle) {
        console.log('✅ Found product by title:', productByTitle.title);
        return res.status(200).json({
          success: true,
          data: productByTitle
        });
      }
      
      return res.status(404).json({
        success: false,
        message: 'პროდუქტი ვერ მოიძებნა',
        searchedSlug: slug,
        originalSlug: originalSlug
      });
    }

    console.log('✅ Found product:', product.title);
    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('❌ Error fetching product by slug:', error);
    res.status(500).json({
      success: false,
      message: 'სერვერის შეცდომა',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};
// ID-ით პროდუქტის მიღება
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('userId', 'name secondName profileImage');
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'პროდუქტი ვერ მოიძებნა'
      });
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error fetching product by ID:', error);
    
    // Handle invalid ObjectId error
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

// ყველა პროდუქტის მიღება (ფილტრებით და პაგინაციით)
const getAllProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    // Filter options
    const filter = {};
    
    // Category filter
    if (req.query.category && req.query.category !== 'all') {
      filter.category = req.query.category;
    }
    
    // City filter
    if (req.query.city && req.query.city !== 'all') {
      filter.cities = { $regex: new RegExp(req.query.city, 'i') };
    }
    
    // Price range filter
    if (req.query.minPrice || req.query.maxPrice) {
      filter.price = {};
      if (req.query.minPrice) filter.price.$gte = parseInt(req.query.minPrice);
      if (req.query.maxPrice) filter.price.$lte = parseInt(req.query.maxPrice);
    }
    
    // Year filter
    if (req.query.year) {
      filter.year = parseInt(req.query.year);
    }
    
    // Search by title or description
    if (req.query.search) {
      filter.$or = [
        { title: { $regex: new RegExp(req.query.search, 'i') } },
        { description: { $regex: new RegExp(req.query.search, 'i') } }
      ];
    }

    // Sort options
    let sortOption = { createdAt: -1 }; // Default: newest first
    
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
        default:
          sortOption = { createdAt: -1 };
      }
    }

    const products = await Product.find(filter)
      .populate('userId', 'name secondName profileImage')
      .sort(sortOption)
      .skip(skip)
      .limit(limit);

    const total = await Product.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: products,
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
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'სერვერის შეცდომა',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

// მომხმარებლის პროდუქტების მიღება
const getUserProducts = async (req, res) => {
  try {
    const products = await Product.findByUserId(req.user.id)
      .populate('userId', 'name secondName profileImage');
      
    res.status(200).json({
      success: true,
      data: products,
      count: products.length
    });
  } catch (error) {
    console.error('Error fetching user products:', error);
    res.status(500).json({
      success: false,
      message: 'სერვერის შეცდომა',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

// პროდუქტის დამატება
// controllers/productController.js - განახლებული addProduct ფუნქცია
const addProduct = async (req, res) => {
  try {
    const images = [];
    
    console.log('📁 Processing uploaded files...');
    console.log('Files array:', req.files);
    console.log('Files by field:', req.filesByField);
    console.log('Body:', req.body);
    
    // ✅ Handle uploaded files - უნივერსალური მიდგომა
    if (req.files && req.files.length > 0) {
      console.log(`📸 Processing ${req.files.length} files...`);
      
      // ვარიანტი 1: თუ Cloudinary storage გამოიყენება
      if (req.files[0].path) {
        req.files.forEach((file, index) => {
          console.log(`📎 File ${index + 1}: ${file.originalname} -> ${file.path}`);
          images.push(file.path); // Cloudinary URL
        });
      }
      // ვარიანტი 2: თუ Buffer storage გამოიყენება  
      else if (req.files[0].buffer) {
        req.files.forEach((file, index) => {
          console.log(`📎 File ${index + 1}: ${file.originalname} -> converting to base64`);
          const base64Image = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
          images.push(base64Image);
        });
      }
    }

    // Validate required fields
    const { title, cities, category, email, year, phone, price, description } = req.body;
    
    if (!title || !cities || !category || !email || !year || !phone || !price || !description) {
      return res.status(400).json({
        success: false,
        message: 'ყველა სავალდებულო ველი უნდა იყოს შევსებული',
        receivedFields: Object.keys(req.body),
        missingFields: {
          title: !title,
          cities: !cities,
          category: !category,
          email: !email,
          year: !year,
          phone: !phone,
          price: !price,
          description: !description
        }
      });
    }

    // ✅ Create product data
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
      images: images.length > 0 ? images : undefined
    };

    console.log('💾 Creating product with data:', {
      ...productData,
      images: images.length > 0 ? `${images.length} images` : 'no images'
    });

    const product = new Product(productData);
    await product.save();

    // Populate user info for response
    await product.populate('userId', 'name secondName profileImage');

    console.log('✅ Product created successfully:', product.title);

    res.status(201).json({
      success: true,
      data: product,
      message: 'პროდუქტი წარმატებით დაემატა',
      debug: {
        uploadedImages: images.length,
        productId: product._id,
        slug: product.slug
      }
    });
  } catch (error) {
    console.error('❌ Error adding product:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'ვალიდაციის შეცდომა',
        errors: errors,
        validationDetails: error.errors
      });
    }
    
    // Handle duplicate slug error
    if (error.code === 11000 && error.keyPattern && error.keyPattern.slug) {
      return res.status(400).json({
        success: false,
        message: 'ამ სახელწოდებით პროდუქტი უკვე არსებობს',
        duplicateField: 'slug'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'პროდუქტის დამატება ვერ მოხერხდა',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
};

// პროდუქტის განახლება
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'პროდუქტი ვერ მოიძებნა'
      });
    }

    // Check if user owns the product
    if (product.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'არ გაქვთ ავტორიზაცია ამ პროდუქტის შესაცვლელად'
      });
    }

    // Handle new images if uploaded
    if (req.files && req.files.length > 0) {
      const newImages = [];
      req.files.forEach(file => {
        const base64Image = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        newImages.push(base64Image);
      });
      req.body.images = newImages;
    }

    // Update fields
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
    ).populate('userId', 'name secondName profileImage');

    res.status(200).json({
      success: true,
      data: updatedProduct,
      message: 'პროდუქტი წარმატებით განახლდა'
    });
  } catch (error) {
    console.error('Error updating product:', error);
    
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

// პროდუქტის წაშლა
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'პროდუქტი ვერ მოიძებნა'
      });
    }

    // Check if user owns the product
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
    console.error('Error deleting product:', error);
    
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

// კატეგორიების სტატისტიკის მიღება
const getCategoryStats = async (req, res) => {
  try {
    const stats = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching category stats:', error);
    res.status(500).json({
      success: false,
      message: 'სერვერის შეცდომა'
    });
  }
};
const searchProducts = async (req, res) => {
  try {
    const { title, slug } = req.query;
    const filter = {};

    if (title) {
      filter.title = { $regex: new RegExp(title, 'i') };
    }

    if (slug) {
      filter.slug = slug; // ზუსტად ემთხვევა
    }

    const results = await Product.find(filter).populate('userId', 'name secondName profileImage');

    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({
      success: false,
      message: 'ძებნის შეცდომა',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

module.exports = {
  addProduct,
  getUserProducts,
  deleteProduct,
  updateProduct,
  getAllProducts,
  getProductById,
  getProductBySlug,
  getCategoryStats,
  searchProducts
};
