// scripts/syncProductAvatars.js
// ეს script ერთხელ გაშვი რომ არსებულ პროდუქტებს დაემატოს userAvatar

const mongoose = require('mongoose');
const Product = require('../models/product');
const User = require('../models/User');
require('dotenv').config();

async function syncProductAvatars() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    
    console.log('✅ Connected to database');
    console.log('📊 Database:', mongoose.connection.db.databaseName);
    
    // ✅ მოძებნე ყველა პროდუქტი რომელსაც არ აქვს userAvatar
    const productsWithoutAvatar = await Product.find({
      $or: [
        { userAvatar: { $exists: false } },
        { userAvatar: null },
        { userAvatar: '' }
      ]
    });
    
    console.log(`\n📦 Found ${productsWithoutAvatar.length} products without userAvatar\n`);
    
    if (productsWithoutAvatar.length === 0) {
      console.log('✅ All products already have userAvatar!');
      process.exit(0);
    }
    
    let updatedCount = 0;
    let failedCount = 0;
    
    for (const product of productsWithoutAvatar) {
      try {
        // ✅ მოძებნე User
        const user = await User.findById(product.userId);
        
        if (!user) {
          console.log(`⚠️ User not found for product: ${product.title} (userId: ${product.userId})`);
          failedCount++;
          continue;
        }
        
        // ✅ განახლე product-ი
        const userAvatar = user.avatar || user.profileImage || 'https://i.ibb.co/GvshXkLK/307ce493-b254-4b2d-8ba4-d12c080d6651.jpg';
        const userName = user.name || 'უცნობი';
        
        product.userAvatar = userAvatar;
        product.userName = userName;
        
        await product.save();
        
        updatedCount++;
        console.log(`✅ [${updatedCount}/${productsWithoutAvatar.length}] Updated: ${product.title}`);
        console.log(`   └─ User: ${userName}`);
        console.log(`   └─ Avatar: ${userAvatar.substring(0, 50)}...`);
        
      } catch (error) {
        console.error(`❌ Failed to update product: ${product.title}`, error.message);
        failedCount++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY:');
    console.log('='.repeat(60));
    console.log(`✅ Successfully updated: ${updatedCount} products`);
    console.log(`❌ Failed to update: ${failedCount} products`);
    console.log(`📦 Total processed: ${productsWithoutAvatar.length} products`);
    console.log('='.repeat(60));
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Script error:', error);
    process.exit(1);
  }
}

// გაშვება
syncProductAvatars();