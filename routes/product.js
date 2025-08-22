// routes/product.js - ნახვების ფუნქციით განახლებული
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
  searchProducts,
  incrementProductViews, // ✅ ახალი
  getPopularProducts, // ✅ ახალი
  getViewsStatistics, // ✅ ახალი
  getProductViews // ✅ ახალი - კონკრეტული პროდუქტის ნახვები
} = require('../controllers/productController');

// ✅ ყველა პროდუქტის მიღება + ფილტრები და პაგინაცია
router.get('/', getAllProducts);

// ✅ საჯარო endpoint-ის alias
router.get('/public', getAllProducts);

// ✅ ნახვების სტატისტიკა
router.get('/stats/views', getViewsStatistics);

// ✅ კატეგორიების სტატისტიკა (ნახვებითაც)
router.get('/stats/categories', getCategoryStats);

// ✅ პოპულარული პროდუქტები (ნახვების მიხედვით)
router.get('/popular', getPopularProducts);

// ✅ SLUG ROUTE - აუცილებლად უნდა იყოს ID route-ამდე!
router.get('/by-slug/:slug', getProductBySlug);

// ✅ Frontend-ის მოთხოვნის შესაბამისი routes
router.post('/:id/view', incrementProductViews); // Frontend ითხოვს /view (არა /views)
router.get('/:id/views', getProductViews); // კონკრეტული პროდუქტის ნახვები

// ✅ ძველი route-ი backward compatibility-სთვის
router.post('/:id/views', incrementProductViews);

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

// Upload error handling
router.use(handleUploadError);

module.exports = router;