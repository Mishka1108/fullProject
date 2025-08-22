// migration/addViewsToProducts.js - არსებული პროდუქტებისთვის ნახვების ველის დამატება
const mongoose = require('mongoose');
require('dotenv').config();

const addViewsToProducts = async () => {
  try {
    console.log('🔄 Starting migration to add views field to products...');
    
    // MongoDB-სთან დაკავშირება
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // ✅ ყველა პროდუქტზე views ველის დამატება
    const result = await mongoose.connection.db.collection('products').updateMany(
      { views: { $exists: false } }, // views ველი არ აქვს
      { 
        $set: { 
          views: 0,
          lastViewedAt: null,
          viewHistory: []
        } 
      }
    );

    console.log(`✅ Migration completed!`);
    console.log(`📊 Updated ${result.modifiedCount} products`);
    console.log(`📊 Matched ${result.matchedCount} products`);

    // ✅ ვალიდაცია - შევამოწმოთ რამდენ პროდუქტს აქვს views ველი
    const productsWithViews = await mongoose.connection.db.collection('products').countDocuments({
      views: { $exists: true }
    });

    const totalProducts = await mongoose.connection.db.collection('products').countDocuments({});

    console.log(`📊 Products with views field: ${productsWithViews}/${totalProducts}`);

    if (productsWithViews === totalProducts) {
      console.log('🎉 All products now have views field!');
    } else {
      console.log('⚠️ Some products still missing views field');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔒 Database connection closed');
    process.exit(0);
  }
};

// ✅ Run migration
addViewsToProducts();

/* 
🚀 ამ script-ის გაშვება:
node migration/addViewsToProducts.js

ან package.json-ში script დამატება:
"scripts": {
  "migrate:views": "node migration/addViewsToProducts.js"
}

npm run migrate:views
*/