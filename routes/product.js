// routes/product.js - სრული განახლებული ვერსია
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
  incrementProductViews,
  getPopularProducts,
  getViewsStatistics,
  getProductViews
} = require('../controllers/productController');

// ============================================
// PUBLIC ROUTES (NO AUTHENTICATION REQUIRED)
// ============================================

// ✅ Get all products with filters and pagination
router.get('/', getAllProducts);

// ✅ Alias for public products
router.get('/public', getAllProducts);

// ✅ Statistics routes (specific routes first!)
router.get('/stats/views', getViewsStatistics);
router.get('/stats/categories', getCategoryStats);

// ✅ Popular products (by views)
router.get('/popular', getPopularProducts);

// ✅ Search products
router.get('/search', searchProducts);

// ============================================
// ✅✅✅ CRITICAL: SLUG ROUTE MUST BE BEFORE /:id ✅✅✅
// ============================================
router.get('/by-slug/:slug', getProductBySlug);

// ============================================
// VIEW TRACKING ROUTES
// ============================================
router.post('/:id/view', incrementProductViews);
router.get('/:id/views', getProductViews);
router.post('/:id/views', incrementProductViews); // backward compatibility

// ============================================
// PROTECTED ROUTES (AUTHENTICATION REQUIRED)
// ============================================

// ✅ Get current user's products
router.get('/user', verifyToken, getUserProducts);

// ✅ Add new product
router.post('/', verifyToken, uploadProductImages, addProduct);

// ✅ Update product
router.put('/:id', verifyToken, uploadProductImages, updateProduct);

// ✅ Delete product
router.delete('/:id', verifyToken, deleteProduct);

// ============================================
// ✅✅✅ DYNAMIC ROUTES (MUST BE LAST!) ✅✅✅
// ============================================

// ✅ Get single product by ID (MUST BE LAST!)
router.get('/:id', getProductById);

// ============================================
// ERROR HANDLING MIDDLEWARE
// ============================================
router.use(handleUploadError);

module.exports = router;