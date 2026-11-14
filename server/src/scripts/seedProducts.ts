import '../config/env.js';
import mongoose from 'mongoose';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { connectDB } from '../config/db.js';
import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const run = async () => {
  await connectDB();

  const productCount = await Product.countDocuments();
  const categoryCount = await Category.countDocuments();

  if (productCount > 0 || categoryCount > 0) {
    console.log(`Database already has ${productCount} products and ${categoryCount} categories — skipping seed.`);
    console.log('(Delete existing data first if you want to re-seed from scratch.)');
    await mongoose.disconnect();
    return;
  }

  const products = JSON.parse(readFileSync(path.join(__dirname, '../data/seedProducts.json'), 'utf-8'));
  const categories = JSON.parse(readFileSync(path.join(__dirname, '../data/seedCategories.json'), 'utf-8'));

  await Category.insertMany(categories);
  console.log(`✅ ${categories.length}টা ক্যাটাগরি যোগ হয়েছে`);

  await Product.insertMany(products);
  console.log(`✅ ${products.length}টা প্রোডাক্ট যোগ হয়েছে`);

  console.log('\n⚠️  নোট: প্রোডাক্টগুলোর ছবি এখন একটা placeholder ছবি দেখাচ্ছে।');
  console.log('   আসল প্রোডাক্ট ছবি Admin প্যানেল থেকে (Products > Edit) আপলোড করে বদলে নিন।');

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
