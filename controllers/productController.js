// controllers/productController.js - გამოსწორებული ვერსია

const Product = require('../models/product');
const cloudinary = require('../utils/cloudinary');
const User = require('../models/User');

exports.addProduct = async (req, res) => {
  try {
    console.log('Received form data:', req.body);
    console.log('Received files:', req.files);
    
    // შევამოწმოთ, ატვირთული არის თუ არა მინიმუმ ერთი სურათი
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ message: 'მინიმუმ ერთი პროდუქტის სურათი აუცილებელია' });
    }

    // ვალიდაცია input ველებისთვის
    const requiredFields = ['title', 'category', 'year', 'price', 'description', 'phone', 'email', 'city'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        message: `შემდეგი ველები აუცილებელია: ${missingFields.join(', ')}` 
      });
    }

    // ვალიდაცია phone ნომრისთვის
    const phoneRegex = /^\+?\d{9,15}$/;
    if (!phoneRegex.test(req.body.phone)) {
      return res.status(400).json({ 
        message: 'ტელეფონის ნომერი უნდა იყოს 9-დან 15-მდე ციფრი' 
      });
    }

    // ვალიდაცია email-ისთვის
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(req.body.email)) {
      return res.status(400).json({ 
        message: 'მიუთითეთ სწორი ელფოსტის მისამართი' 
      });
    }

    // ვალიდაცია ფასისთვის და წლისთვის
    const price = parseFloat(req.body.price);
    const year = parseInt(req.body.year);
    
    if (isNaN(price) || price < 0) {
      return res.status(400).json({ 
        message: 'ფასი უნდა იყოს დადებითი რიცხვი' 
      });
    }

    if (isNaN(year) || year < 2000 || year > new Date().getFullYear()) {
      return res.status(400).json({ 
        message: `წელი უნდა იყოს ${2000}-დან ${new Date().getFullYear()}-მდე` 
      });
    }

    // 3 სურათის URL-ების მიღება
    const images = [];
    
    // შევამოწმოთ თითოეული სურათი (productImage1, productImage2, productImage3)
    for (let i = 1; i <= 3; i++) {
      const fieldName = `productImage${i}`;
      if (req.files[fieldName] && req.files[fieldName][0]) {
        images.push(req.files[fieldName][0].path);
        console.log(`სურათი ${i} ატვირთულია:`, req.files[fieldName][0].path);
      }
    }

    // მინიმუმ ერთი სურათი უნდა იყოს
    if (images.length === 0) {
      return res.status(400).json({ message: 'მინიმუმ ერთი სურათი აუცილებელია' });
    }

    console.log(`სულ ატვირთულია ${images.length} სურათი`);
    
    // შევქმნათ ახალი პროდუქტი
    const product = await Product.create({
      userId: req.user.id,
      title: req.body.title,
      category: req.body.category,
      year: year,
      price: price,
      description: req.body.description,
      images: images,
      cities: req.body.city,
      phone: req.body.phone,
      email: req.body.email
    });

    console.log('Product created successfully:', {
      id: product._id,
      title: product.title,
      cities: product.cities,
      phone: product.phone,
      email: product.email,
      imagesCount: product.images.length
    });

    res.status(201).json({
      success: true,
      message: 'პროდუქტი წარმატებით დაემატა',
      product
    });
  } catch (error) {
    console.error('პროდუქტის დამატების შეცდომა:', error);
    
    if (error.name === 'ValidationError') {
      const errorMessages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'ვალიდაციის შეცდომა', 
        errors: errorMessages 
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'ასეთი მონაცემები უკვე არსებობს' 
      });
    }

    if (error.message && error.message.includes('cloudinary')) {
      return res.status(500).json({ 
        message: 'სურათის ატვირთვისას დაფიქსირდა შეცდომა' 
      });
    }

    res.status(500).json({ 
      message: 'სერვერის შეცდომა', 
      error: process.env.NODE_ENV === 'development' ? error.message : 'შიდა სერვერის შეცდომა'
    });
  }
};

exports.getUserProducts = async (req, res) => {
  try {
    console.log('getUserProducts called with user:', req.user);
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        message: 'Authentication required',
        success: false 
      });
    }

    const products = await Product.find({ userId: req.user.id }).sort({ createdAt: -1 });
    
    console.log(`Found ${products.length} products for user ${req.user.id}`);
    
    res.status(200).json({
      success: true,
      count: products.length,
      products
    });
  } catch (error) {
    console.error('პროდუქტების მიღების შეცდომა:', error);
    res.status(500).json({ 
      message: 'სერვერის შეცდომა', 
      error: error.message,
      success: false
    });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'პროდუქტი ვერ მოიძებნა' });
    }
    
    if (product.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'არ გაქვთ ამ პროდუქტის წაშლის უფლება' });
    }
    
    // ყველა სურათის წაშლა Cloudinary-დან
    try {
      if (product.images && product.images.length > 0) {
        for (const imageUrl of product.images) {
          const publicId = imageUrl.split('/').slice(-1)[0].split('.')[0];
          await cloudinary.uploader.destroy(`product_images/${publicId}`);
          console.log(`სურათი წაიშალა: ${publicId}`);
        }
      }
    } catch (cloudinaryError) {
      console.error('Cloudinary deletion error:', cloudinaryError);
    }
    
    await product.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'პროდუქტი წარმატებით წაიშალა'
    });
  } catch (error) {
    console.error('პროდუქტის წაშლის შეცდომა:', error);
    res.status(500).json({ message: 'სერვერის შეცდომა', error: error.message });
  }
};

// ყველა პროდუქტის მიღება
exports.getAllProducts = async (req, res) => {
  try {
    const { category, minPrice, city, maxPrice, search } = req.query;

    console.log('მიღებული query პარამეტრები:', { category, minPrice, city, maxPrice, search });

    const filter = {};
    
    if (category) {
      filter.category = category;
    }
    
    if (city) {
      filter.cities = { $regex: new RegExp(city, 'i') };
    }
    
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) {
        filter.price.$gte = Number(minPrice);
      }
      if (maxPrice) {
        filter.price.$lte = Number(maxPrice);
      }
    }
    
    if (search) {
      filter.$or = [
        { title: { $regex: new RegExp(search, 'i') } },
        { description: { $regex: new RegExp(search, 'i') } }
      ];
    }
    
    const products = await Product.find(filter).sort({ createdAt: -1 });
    
    const productsWithUserInfo = await Promise.all(products.map(async (product) => {
      const user = await User.findById(product.userId).select('name secondName');
      return {
        ...product._doc,
        id: product._id.toString(),
        userName: user ? `${user.name} ${user.secondName}` : 'უცნობი მომხმარებელი',
        image: product.images && product.images.length > 0 ? product.images[0] : product.image
      };
    }));
    
    res.status(200).json({
      success: true,
      count: productsWithUserInfo.length,
      products: productsWithUserInfo,
      appliedFilters: { category, city, minPrice, maxPrice, search }
    });
  } catch (error) {
    console.error('პროდუქტების მიღების შეცდომა:', error);
    res.status(500).json({ message: 'სერვერის შეცდომა', error: error.message });
  }
};

// კონკრეტული პროდუქტის მიღება ID-ით
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'პროდუქტი ვერ მოიძებნა' });
    }
    
    const user = await User.findById(product.userId).select('name secondName profileImage');
    
    const productWithUserInfo = {
      ...product._doc,
      id: product._id.toString(),
      userName: user ? `${user.name} ${user.secondName}` : 'უცნობი მომხმარებელი',
      userProfileImage: user ? user.profileImage : null,
      sellerEmail: product.email,
      sellerPhone: product.phone,
      sellerName: user ? `${user.name} ${user.secondName}` : 'უცნობი მომხმარებელი',
      image: product.images && product.images.length > 0 ? product.images[0] : product.image
    };
    
    res.status(200).json({
      success: true,
      product: productWithUserInfo
    });
  } catch (error) {
    console.error('პროდუქტის მიღების შეცდომა:', error);
    res.status(500).json({ message: 'სერვერის შეცდომა', error: error.message });
  }
};