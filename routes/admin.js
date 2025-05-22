// First, let's modify your admin.js routes file
// routes/admin.js

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminAuthMiddleware = require('../middleware/adminAuth');
const Product = require('../models/product');

// Admin authentication routes
router.post('/login', adminController.loginAdmin);
router.post('/register', adminController.registerAdmin); // Only for development

// Admin profile route
router.get('/profile', adminAuthMiddleware, adminController.getAdminProfile);

// USER MANAGEMENT ROUTES
// Get all users
router.get('/users', adminAuthMiddleware, async (req, res) => {
  try {
    const User = require('../models/User');
    const users = await User.find().select('-password');
    res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single user details
router.get('/users/:userId', adminAuthMiddleware, async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.params.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user verification status
router.patch('/users/:userId/status', adminAuthMiddleware, async (req, res) => {
  try {
    const User = require('../models/User');
    const { isVerified } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { isVerified },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json({
      success: true,
      message: `User ${isVerified ? 'verified' : 'unverified'} successfully`,
      user
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user
router.delete('/users/:userId', adminAuthMiddleware, async (req, res) => {
  try {
    const User = require('../models/User');
    const deletedUser = await User.findByIdAndDelete(req.params.userId);
    
    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Optionally, also delete all products by this user
    await Product.deleteMany({ userId: req.params.userId });
    
    res.status(200).json({
      success: true,
      message: 'User and all associated products deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PRODUCT MANAGEMENT ROUTES
// Get all products
router.get('/products', adminAuthMiddleware, async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    
    // Get user info for each product
    const User = require('../models/User');
    const productsWithUserInfo = await Promise.all(products.map(async (product) => {
      const user = await User.findById(product.userId).select('name secondName');
      return {
        ...product._doc,
        userName: user ? `${user.name} ${user.secondName}` : 'Unknown User'
      };
    }));
    
    res.status(200).json({
      success: true,
      count: productsWithUserInfo.length,
      products: productsWithUserInfo
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single product details
router.get('/products/:productId', adminAuthMiddleware, async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Get user info for the product
    const User = require('../models/User');
    const user = await User.findById(product.userId).select('name secondName');
    
    const productWithUserInfo = {
      ...product._doc,
      userName: user ? `${user.name} ${user.secondName}` : 'Unknown User'
    };
    
    res.status(200).json({
      success: true,
      product: productWithUserInfo
    });
  } catch (error) {
    console.error('Error fetching product details:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete product
router.delete('/products/:productId', adminAuthMiddleware, async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Delete image from Cloudinary
    const cloudinary = require('../utils/cloudinary');
    try {
      // Extract the public ID from the image URL
      const publicId = product.image.split('/').slice(-1)[0].split('.')[0];
      await cloudinary.uploader.destroy(`product_images/${publicId}`);
    } catch (cloudinaryError) {
      console.error('Error deleting image from Cloudinary:', cloudinaryError);
      // Continue with product deletion even if image deletion failed
    }
    
    await product.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;