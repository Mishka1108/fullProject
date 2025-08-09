const express = require('express');
const router = express.Router();
const { uploadProductImages, handleUploadError } = require('../utils/productUpload');
const { verifyToken } = require('../middleware/auth');
const {
  addProduct,
  getUserProducts,
  deleteProduct,
  updateProduct,
  getAllProducts,
  getProductById,
  getProductBySlug,
  getCategoryStats,
  searchProducts // ✅ ახალი კონტროლერი
} = require('../controllers/productController');

// ✅ ყველა პროდუქტის მიღება + ფილტრები და პაგინაცია
router.get('/', getAllProducts);

// ✅ საჯარო endpoint-ის alias
router.get('/public', getAllProducts);

// ✅ კატეგორიების სტატისტიკა
router.get('/stats/categories', getCategoryStats);

// ✅ პროდუქტის ძებნა (მაგ. /api/products/search?slug=თოჯინა ან title=ნოუთბუქი)
// router.get('/search', searchProducts);

// ✅ SLUG ROUTE - აუცილებლად უნდა იყოს ID route-ამდე!
router.get('/by-slug/:slug', getProductBySlug);

// ✅ დაცული routes (authentication სჭირდება)
router.get('/user', verifyToken, getUserProducts);

// ✅ პროდუქტის დამატება
router.post('/', verifyToken, uploadProductImages, addProduct);

// ✅ პროდუქტის განახლება
router.put('/:id', verifyToken, uploadProductImages, updateProduct);

// ✅ პროდუქტის წაშლა
router.delete('/:id', verifyToken, deleteProduct);

// ✅ კონკრეტული პროდუქტის მიღება ID-ით (ბოლოში!)
router.get('/:id', getProductById);

// ✅ Upload error handling
router.use(handleUploadError);

module.exports = router;
