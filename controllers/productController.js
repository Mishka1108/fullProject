// product.controller.js - განახლებული ვერსია

const Product = require('../models/product');
const cloudinary = require('../utils/cloudinary');
const User = require('../models/User');

exports.addProduct = async (req, res) => {
  try {
    console.log('Received form data:', req.body);
    console.log('Received file:', req.file);
    
    // შევამოწმოთ, ატვირთული არის თუ არა სურათი
    if (!req.file) {
      return res.status(400).json({ message: 'პროდუქტის სურათი აუცილებელია' });
    }

    // ვალიდაცია input ველებისთვის
    const requiredFields = ['title', 'category', 'year', 'price', 'description', 'phone', 'email'];
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

    // მივიღოთ ატვირთული სურათის URL
    const imageUrl = req.file.path;
    
    // შევქმნათ ახალი პროდუქტი
    const product = await Product.create({
      userId: req.user.id,
      title: req.body.title,
      category: req.body.category,
      year: year,
      price: price,
      description: req.body.description,
      image: imageUrl,
      cities: req.body.city || req.body.cities, // Frontend-იდან city მოდის, backend-ში cities უნდა
      phone: req.body.phone,
      email: req.body.email
    });

    console.log('Product created successfully:', {
      id: product._id,
      title: product.title,
      cities: product.cities,
      phone: product.phone,
      email: product.email
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
    const products = await Product.find({ userId: req.user.id }).sort({ createdAt: -1 });
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
    
    if (product.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'არ გაქვთ ამ პროდუქტის წაშლის უფლება' });
    }
    
    try {
      const publicId = product.image.split('/').slice(-1)[0].split('.')[0];
      await cloudinary.uploader.destroy(`product_images/${publicId}`);
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

// ყველა პროდუქტის მიღება - გასწორებული ქალაქის ფილტრაციით
exports.getAllProducts = async (req, res) => {
  try {
    // ფილტრაციისთვის query პარამეტრების მიღება
    const { category, minPrice, city, maxPrice, search } = req.query;

    console.log('მიღებული query პარამეტრები:', { category, minPrice, city, maxPrice, search });

    // ფილტრის ობიექტის შექმნა
    const filter = {};
    
    // კატეგორიის ფილტრაცია
    if (category) {
      filter.category = category;
      console.log('კატეგორიის ფილტრი:', category);
    }
    
    // ქალაქის ფილტრაცია - გასწორებული ვერსია
    if (city) {
      // cities ველში ზუსტი დამთხვევის ძიება ან ნაწილობრივი დამთხვევა
      filter.cities = { $regex: new RegExp(city, 'i') };
      console.log('ქალაქის ფილტრი:', city);
    }
    
    // ფასის ფილტრაცია
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) {
        filter.price.$gte = Number(minPrice);
        console.log('მინიმალური ფასი:', minPrice);
      }
      if (maxPrice) {
        filter.price.$lte = Number(maxPrice);
        console.log('მაქსიმალური ფასი:', maxPrice);
      }
    }
    
    // საძიებო ტექსტის ფილტრაცია
    if (search) {
      filter.$or = [
        { title: { $regex: new RegExp(search, 'i') } },
        { description: { $regex: new RegExp(search, 'i') } }
      ];
      console.log('საძიებო ტერმინი:', search);
    }
    
    console.log('საბოლოო ფილტრი:', JSON.stringify(filter, null, 2));
    
    // მონაცემთა ბაზიდან მოვითხოვოთ პროდუქტები ფილტრის გათვალისწინებით
    const products = await Product.find(filter).sort({ createdAt: -1 });
    
    console.log(`ნაპოვნია ${products.length} პროდუქტი`);
    
    // დამატებით მივიღოთ ყოველი პროდუქტის ავტორის სახელი
    const productsWithUserInfo = await Promise.all(products.map(async (product) => {
      const user = await User.findById(product.userId).select('name secondName');
      return {
        ...product._doc,
        id: product._id.toString(), // დავამატოთ id ველი frontend-ისთვის
        userName: user ? `${user.name} ${user.secondName}` : 'უცნობი მომხმარებელი'
      };
    }));
    
    // თუ ქალაქის ფილტრი იყო განსაზღვრული, დავბეჭდოთ რამდენი პროდუქტი მოიძებნა
    if (city) {
      console.log(`ქალაქ '${city}'-ში ნაპოვნია ${productsWithUserInfo.length} პროდუქტი`);
      
      // დებაგინგისთვის - დავბეჭდოთ რამდენიმე პროდუქტის ქალაქები
      productsWithUserInfo.slice(0, 3).forEach((product, index) => {
        console.log(`პროდუქტი ${index + 1}: ${product.title} - ქალაქი: ${product.cities}`);
      });
    }
    
    res.status(200).json({
      success: true,
      count: productsWithUserInfo.length,
      products: productsWithUserInfo,
      appliedFilters: { category, city, minPrice, maxPrice, search } // დებაგინგისთვის
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
      id: product._id.toString(), // დავამატოთ id ველი
      userName: user ? `${user.name} ${user.secondName}` : 'უცნობი მომხმარებელი',
      userProfileImage: user ? user.profileImage : null,
      sellerEmail: product.email,
      sellerPhone: product.phone,
      sellerName: user ? `${user.name} ${user.secondName}` : 'უცნობი მომხმარებელი'
    };
    
    console.log('Product with contact info:', {
      id: productWithUserInfo.id,
      cities: productWithUserInfo.cities,
      email: productWithUserInfo.email,
      phone: productWithUserInfo.phone
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