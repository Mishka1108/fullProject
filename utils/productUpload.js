//utils/productUpload.js
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('./cloudinary');

// შევქმნათ Cloudinary-ის storage პროდუქტის სურათებისთვის
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'product_images',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    transformation: [{ width: 1000, height: 1000, crop: 'limit' }],
    public_id: (req, file) => `product_${req.user.id}_${Date.now()}`
  },
});

// დავამატოთ ფაილის ზომის ლიმიტი და შეცდომების დამუშავება
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('არასწორი ფაილის ტიპი! გთხოვთ, ატვირთოთ მხოლოდ სურათები.'), false);
  }
};

const productParser = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB ლიმიტი
  fileFilter: fileFilter
});

module.exports = productParser;
