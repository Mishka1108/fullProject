//utils/productUpload.js - განახლებული ვერსია 3 სურათისთვის
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('./cloudinary');

// შევქმნათ Cloudinary-ის storage პროდუქტის სურათებისთვის
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'product_images',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 1920, height: 1080, crop: 'limit' },
      { quality: 'auto' },
      { fetch_format: 'auto' }
    ],
    public_id: (req, file) => {
      const imageIndex = file.fieldname.replace('productImage', '');
      return `product_${req.user.id}_${Date.now()}_${imageIndex}`;
    }
  },
});

// დავამატოთ ფაილის ზომის ლიმიტი და შეცდომების დამუშავება
const fileFilter = (req, file, cb) => {
  console.log('Processing file:', file.fieldname, file.originalname);
  
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('არასწორი ფაილის ტიპი! გთხოვთ, ატვირთოთ მხოლოდ სურათები.'), false);
  }
};

// 3 სურათისთვის multer configuration
const productParser = multer({
  storage: storage,
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB ლიმიტი თითოეული ფაილისთვის
    files: 3 // მაქსიმუმ 3 ფაილი
  },
  fileFilter: fileFilter
});

// 3 სურათის ველების განსაზღვრა
const uploadFields = [
  { name: 'productImage1', maxCount: 1 },
  { name: 'productImage2', maxCount: 1 },
  { name: 'productImage3', maxCount: 1 }
];

// Export როგორც middleware function
const uploadProductImages = productParser.fields(uploadFields);

// Error handling middleware
const handleUploadError = (err, req, res, next) => {
  console.error('Upload error:', err);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        message: 'სურათის ზომა ძალიან დიდია. მაქსიმუმ 10MB დასაშვებია.' 
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ 
        message: 'ძალიან ბევრი ფაილია. მაქსიმუმ 3 სურათი შეიძლება ატვირთოს.' 
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ 
        message: 'მოულოდნელი ფაილის ველი. გამოიყენეთ productImage1, productImage2, productImage3.' 
      });
    }
  }
  
  if (err.message.includes('არასწორი ფაილის ტიპი')) {
    return res.status(400).json({ 
      message: err.message 
    });
  }
  
  return res.status(500).json({ 
    message: 'ფაილის ატვირთვისას დაფიქსირდა შეცდომა' 
  });
};

// Middleware function რომ გამოიყენოს routes-ში
const uploadMiddleware = (req, res, next) => {
  uploadProductImages(req, res, (err) => {
    if (err) {
      return handleUploadError(err, req, res, next);
    }
    
    // ლოგინგი debug-ისთვის
    console.log('Files uploaded successfully:', {
      productImage1: req.files?.productImage1 ? req.files.productImage1[0].originalname : 'არ არის',
      productImage2: req.files?.productImage2 ? req.files.productImage2[0].originalname : 'არ არის',
      productImage3: req.files?.productImage3 ? req.files.productImage3[0].originalname : 'არ არის'
    });
    
    next();
  });
};

module.exports = {
  uploadProductImages: uploadMiddleware,
  handleUploadError,
  uploadFields
};