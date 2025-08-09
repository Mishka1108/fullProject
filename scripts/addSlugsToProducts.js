// scripts/addSlugsToProducts.js - არსებული პროდუქტებისთვის slug-ების დამატება
const mongoose = require('mongoose');
const Product = require('../models/product');
require('dotenv').config();

// Slug generator function (same as in model)
function generateSlug(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\u10A0-\u10FF\w\s-]/g, '') // ქართული ასოები + ლათინური + რიცხვები
    .replace(/\s+/g, '-') // spaces -> hyphens
    .replace(/-+/g, '-') // multiple hyphens -> single hyphen
    .replace(/^-|-$/g, ''); // remove leading/trailing hyphens
}

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  progress: (msg) => console.log(`${colors.cyan}🔄 ${msg}${colors.reset}`)
};

async function addSlugsToExistingProducts() {
  try {
    log.progress('Starting slug migration process...');
    
    // Connect to MongoDB
    log.progress('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    log.success('Connected to MongoDB');
    log.info(`Database: ${mongoose.connection.db.databaseName}`);

    // Find products without slugs
    log.progress('Finding products without slugs...');
    const productsWithoutSlugs = await Product.find({
      $or: [
        { slug: { $exists: false } },
        { slug: null },
        { slug: '' }
      ]
    }).select('_id title slug');

    log.info(`Found ${productsWithoutSlugs.length} products without slugs`);

    if (productsWithoutSlugs.length === 0) {
      log.success('All products already have slugs! No migration needed.');
      return { updated: 0, errors: 0, skipped: 0 };
    }

    // Statistics
    let updated = 0;
    let errors = 0;
    let skipped = 0;
    const startTime = Date.now();

    log.progress('Starting slug generation and update process...');
    console.log('─'.repeat(80));

    // Process products in batches for better performance
    const batchSize = 50;
    const batches = [];
    for (let i = 0; i < productsWithoutSlugs.length; i += batchSize) {
      batches.push(productsWithoutSlugs.slice(i, i + batchSize));
    }

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      log.progress(`Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} products)`);

      // Process batch concurrently but with limited concurrency
      const batchPromises = batch.map(async (product) => {
        try {
          // Skip if title is missing or invalid
          if (!product.title || typeof product.title !== 'string' || product.title.trim().length === 0) {
            log.warning(`Skipping product ${product._id}: Invalid or missing title`);
            return 'skipped';
          }

          let baseSlug = generateSlug(product.title);
          
          // Skip if slug generation failed
          if (!baseSlug || baseSlug.length === 0) {
            log.warning(`Skipping product ${product._id}: Could not generate valid slug from "${product.title}"`);
            return 'skipped';
          }

          let uniqueSlug = baseSlug;
          let counter = 1;
          
          // Find unique slug
          while (await Product.findOne({ 
            slug: uniqueSlug, 
            _id: { $ne: product._id } 
          })) {
            uniqueSlug = `${baseSlug}-${counter}`;
            counter++;
            
            // Prevent infinite loops
            if (counter > 1000) {
              throw new Error(`Could not generate unique slug after 1000 attempts for "${product.title}"`);
            }
          }
          
          // Update product with new slug
          await Product.findByIdAndUpdate(
            product._id, 
            { slug: uniqueSlug },
            { runValidators: false } // Skip validation for faster updates
          );
          
          log.success(`Updated: "${product.title}" → "${uniqueSlug}"`);
          return 'updated';
          
        } catch (error) {
          log.error(`Failed to update product ${product._id}: ${error.message}`);
          return 'error';
        }
      });

      // Wait for batch completion
      const results = await Promise.all(batchPromises);
      
      // Count results
      results.forEach(result => {
        if (result === 'updated') updated++;
        else if (result === 'error') errors++;
        else if (result === 'skipped') skipped++;
      });

      // Show batch progress
      const progress = Math.round(((batchIndex + 1) / batches.length) * 100);
      log.info(`Batch completed. Progress: ${progress}%`);
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('─'.repeat(80));
    log.success('Migration completed!');
    
    // Final statistics
    console.log('\n📊 Migration Results:');
    console.log(`${colors.green}✅ Successfully updated: ${updated} products${colors.reset}`);
    console.log(`${colors.yellow}⚠ Skipped: ${skipped} products${colors.reset}`);
    console.log(`${colors.red}❌ Errors: ${errors} products${colors.reset}`);
    console.log(`⏱ Duration: ${duration} seconds`);
    console.log(`🚀 Average: ${(productsWithoutSlugs.length / parseFloat(duration)).toFixed(2)} products/second`);
    
    // Verify results
    const remainingWithoutSlugs = await Product.countDocuments({
      $or: [
        { slug: { $exists: false } },
        { slug: null },
        { slug: '' }
      ]
    });
    
    if (remainingWithoutSlugs === 0) {
      log.success('✨ All products now have slugs!');
    } else {
      log.warning(`⚠ ${remainingWithoutSlugs} products still missing slugs`);
    }

    return { updated, errors, skipped, duration };
    
  } catch (error) {
    log.error(`Migration failed: ${error.message}`);
    if (error.stack) {
      console.log(error.stack);
    }
    throw error;
  } finally {
    // Always close the connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      log.info('Disconnected from MongoDB');
    }
  }
}

// Test slug generation
function testSlugGeneration() {
  const testCases = [
    'თოჯინა',
    'Samsung Galaxy S23',
    'მანქანა BMW X5',
    'ქართული წიგნი',
    'iPhone 15 Pro Max!!!',
    'test product   with spaces',
    'პროდუქტი-მრავალი-ტირეებით',
    '123 რიცხვებიანი პროდუქტი',
    'English Product ქართულით'
  ];

  console.log('\n🧪 Testing slug generation:');
  console.log('─'.repeat(60));
  
  testCases.forEach(title => {
    const slug = generateSlug(title);
    console.log(`"${title}" → "${slug}"`);
  });
  
  console.log('─'.repeat(60));
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--test')) {
    testSlugGeneration();
    return;
  }
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
${colors.cyan}MarketZone Slug Migration Tool${colors.reset}

Usage: node scripts/addSlugsToProducts.js [options]

Options:
  --test    Test slug generation with sample data
  --help    Show this help message
  
Examples:
  node scripts/addSlugsToProducts.js          Run migration
  node scripts/addSlugsToProducts.js --test   Test slug generation
    `);
    return;
  }

  // Check environment
  if (!process.env.MONGO_URI) {
    log.error('MONGO_URI environment variable is required');
    process.exit(1);
  }

  // Confirm before running
  if (process.env.NODE_ENV === 'production') {
    log.warning('Running in PRODUCTION environment!');
    log.warning('This will modify your production database.');
    log.info('Press Ctrl+C to cancel, or wait 10 seconds to continue...');
    
    await new Promise(resolve => setTimeout(resolve, 10000));
    log.info('Proceeding with migration...');
  }

  try {
    const results = await addSlugsToExistingProducts();
    
    if (results.errors > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    log.error('Migration process failed');
    process.exit(1);
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    log.error(`Unexpected error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { addSlugsToExistingProducts, generateSlug };