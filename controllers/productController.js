//controllers/productController.js

const Product = require('../models/product');
const cloudinary = require('../utils/cloudinary');
const User = require('../models/User');

exports.addProduct = async (req, res) => {
  try {
    // შევამოწმოთ, ატვირთული არის თუ არა სურათი
    if (!req.file) {
      return res.status(400).json({ message: 'პროდუქტის სურათი აუცილებელია' });
    }
    // მივიღოთ ატვირთული სურათის URL
    const imageUrl = req.file.path;
    
    // შევქმნათ ახალი პროდუქტი
    const product = await Product.create({
      userId: req.user.id,
      title: req.body.title,
      category: req.body.category,
      year: req.body.year,
      price: req.body.price,
      description: req.body.description,
      image: imageUrl,
      location: req.body.location,
      phone: req.body.phone,
      email: req.body.email
    });

    res.status(201).json({
      success: true,
      message: 'პროდუქტი წარმატებით დაემატა',
      product
    });
  } catch (error) {
    console.error('პროდუქტის დამატების შეცდომა:', error);
    res.status(500).json({ message: 'სერვერის შეცდომა', error: error.message });
  }
};

exports.getUserProducts = async (req, res) => {
  try {
    const products = await Product.find({ userId: req.user.id });
    res.status(200).json({
      success: true,
      count: products.length,
      products
    });
  } catch (error) {
    console.error('პროდუქტების მიღების შეცდომა:', error);
    res.status(500).json({ message: 'სერვერის შეცდომა', error: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'პროდუქტი ვერ მოიძებნა' });
    }
    
    // შევამოწმოთ, არის თუ არა მომხმარებელი პროდუქტის მფლობელი
    if (product.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'არ გაქვთ ამ პროდუქტის წაშლის უფლება' });
    }
    
    // წავშალოთ სურათი Cloudinary-დან
    // სურათის public_id მისაღებად გვჭირდება URL-იდან ამოღება
    const publicId = product.image.split('/').slice(-1)[0].split('.')[0];
    await cloudinary.uploader.destroy(`product_images/${publicId}`);
    
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
    // ფილტრაციისთვის query პარამეტრების მიღება
    const { category, minPrice, maxPrice, search } = req.query;
    
    // ფილტრის ობიექტის შექმნა
    const filter = {};
    
    // თუ არსებობს კატეგორია, დავამატოთ ფილტრში
    if (category) {
      filter.category = category;
    }
    
    // თუ არსებობს ფასის ფილტრი
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    
    // თუ არსებობს საძიებო სიტყვა
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // მონაცემთა ბაზიდან მოვითხოვოთ პროდუქტები ფილტრის გათვალისწინებით
    const products = await Product.find(filter).sort({ createdAt: -1 });
    
    // დამატებით მივიღოთ ყოველი პროდუქტის ავტორის სახელი
    const productsWithUserInfo = await Promise.all(products.map(async (product) => {
      const user = await User.findById(product.userId).select('name secondName');
      return {
        ...product._doc,
        userName: user ? `${user.name} ${user.secondName}` : 'უცნობი მომხმარებელი'
      };
    }));
    
    res.status(200).json({
      success: true,
      count: productsWithUserInfo.length,
      products: productsWithUserInfo
    });
  } catch (error) {
    console.error('პროდუქტების მიღების შეცდომა:', error);
    res.status(500).json({ message: 'სერვერის შეცდომა', error: error.message });
  }
};

// კონკრეტული პროდუქტის მიღება ID-ით - FIXED VERSION
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'პროდუქტი ვერ მოიძებნა' });
    }
    
    // მივიღოთ პროდუქტის ავტორის ინფორმაცია
    const user = await User.findById(product.userId).select('name secondName profileImage');
    
    // შემოვიღოთ სრული contact ინფორმაცია
    const productWithUserInfo = {
      ...product._doc,
      // User ინფორმაცია
      userName: user ? `${user.name} ${user.secondName}` : 'უცნობი მომხმარებელი',
      userProfileImage: user ? user.profileImage : null,
      
      // Contact ინფორმაცია პროდუქტიდან (ეს არის ის რაც form-ში შევისავთ)
      // product-ში უკვე არის email და phone fields
      // ამიტომ ისინი ავტომატურად გადავა frontend-ზე
      
      // Debug information
      sellerEmail: product.email, // Explicit mapping
      sellerPhone: product.phone, // Explicit mapping
      sellerName: user ? `${user.name} ${user.secondName}` : 'უცნობი მომხმარებელი'
    };
    
    console.log('Product with contact info:', {
      id: productWithUserInfo._id,
      email: productWithUserInfo.email,
      phone: productWithUserInfo.phone,
      sellerEmail: productWithUserInfo.sellerEmail,
      sellerPhone: productWithUserInfo.sellerPhone,
      userName: productWithUserInfo.userName
    });
    
    res.status(200).json({
      success: true,
      product: productWithUserInfo
    });
  } catch (error) {
    console.error('პროდუქტის მიღების შეცდომა:', error);
    res.status(500).json({ message: 'სერვერის შეცდომა', error: error.message });
  }
};