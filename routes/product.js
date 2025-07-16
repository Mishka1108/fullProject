// routes/product.js - გამოსწორებული ვერსია

const express = require('express');
const router = express.Router();
const { uploadProductImages, handleUploadError } = require('../utils/productUpload');
const { verifyToken } = require('../middleware/auth');
const {
  addProduct,
  getUserProducts,
  deleteProduct,
  getAllProducts,
  getProductById
} = require('../controllers/productController');

// საჯარო routes (authentication არ სჭირდება)
router.get('/', getAllProducts); // ყველა პროდუქტის მიღება
router.get('/public', getAllProducts); // ალტერნატიული საჯარო endpoint

// დაცული routes (authentication სჭირდება)
// მომხმარებლის პროდუქტების მიღება - უნდა იყოს /user route-ამდე
router.get('/user', verifyToken, getUserProducts);

// პროდუქტის დამატება 3 სურათით
router.post('/', verifyToken, uploadProductImages, addProduct);

// პროდუქტის წაშლა
router.delete('/:id', verifyToken, deleteProduct);

// კონკრეტული პროდუქტის მიღება ID-ით - უნდა იყოს ბოლოში
router.get('/:id', getProductById);

// Error handling middleware
router.use(handleUploadError);

module.exports = router;