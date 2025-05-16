//routes/product.js
const express = require('express');
const router = express.Router();
const { addProduct, getUserProducts, deleteProduct, getAllProducts, getProductById } = require('../controllers/productController');
const { verifyToken } = require('../middleware/auth');
const productParser = require('../utils/productUpload');

// პროდუქტის დამატება (ავტორიზებული მომხმარებლისთვის)
router.post("/", verifyToken, productParser.single('productImage'), addProduct);

// მომხმარებლის პროდუქტების მიღება (ავტორიზებული მომხმარებლისთვის)
router.get("/user", verifyToken, getUserProducts);

// პროდუქტის წაშლა (ავტორიზებული მომხმარებლისთვის)
router.delete("/:id", verifyToken, deleteProduct);

// ყველა პროდუქტის მიღება (საჯაროდ ხელმისაწვდომი)
router.get("/", getAllProducts);

// ერთი პროდუქტის მიღება ID-ით (საჯაროდ ხელმისაწვდომი)
router.get("/:id", getProductById);

module.exports = router;