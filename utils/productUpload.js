//utils/productUpload.js - განახლებული ვერსია images field-ისთვის
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
      // უნივერსალური public_id generator
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000);
      return `product_${req.user.id}_${timestamp}_${random}`;
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

// ✅ უნივერსალური multer configuration - ორივე ვარიანტი
const productParser = multer({
  storage: storage,
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB ლიმიტი თითოეული ფაილისთვის
    files: 10 // მაქსიმუმ 10 ფაილი (flexibility-სთვის)
  },
  fileFilter: fileFilter
});

// ✅ უნივერსალური upload middleware
const uploadProductImages = (req, res, next) => {
  // ვცადოთ .any() რათა ყველა ველი მოვიცვათ
  const upload = productParser.any();
  
  upload(req, res, (err) => {
    if (err) {
      return handleUploadError(err, req, res, next);
    }
    
    console.log('📁 Received files:', req.files);
    console.log('📝 Form fields:', req.body);
    
    // ✅ ფაილების ორგანიზება field name-ების მიხედვით
    if (req.files && req.files.length > 0) {
      // Group files by field name
      const filesByField = {};
      req.files.forEach(file => {
        if (!filesByField[file.fieldname]) {
          filesByField[file.fieldname] = [];
        }
        filesByField[file.fieldname].push(file);
      });
      
      req.filesByField = filesByField;
      
      console.log('🗂️ Files organized by field:', Object.keys(filesByField));
    }
    
    next();
  });
};

// Error handling middleware
const handleUploadError = (err, req, res, next) => {
  console.error('Upload error:', err);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        success: false,
        message: 'სურათის ზომა ძალიან დიდია. მაქსიმუმ 10MB დასაშვებია.' 
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ 
        success: false,
        message: 'ძალიან ბევრი ფაილია. მაქსიმუმ 10 სურათი შეიძლება ატვირთოს.' 
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ 
        success: false,
        message: `მოულოდნელი ფაილის ველი: ${err.field}. თუ გაქვთ 'images' ველი, დარწმუნდით რომ ის სწორია.`,
        receivedField: err.field
      });
    }
  }
  
  if (err.message.includes('არასწორი ფაილის ტიპი')) {
    return res.status(400).json({ 
      success: false,
      message: err.message 
    });
  }
  
  return res.status(500).json({ 
    success: false,
    message: 'ფაილის ატვირთვისას დაფიქსირდა შეცდომა',
    error: process.env.NODE_ENV !== 'production' ? err.message : undefined
  });
};

module.exports = {
  uploadProductImages,
  handleUploadError
};