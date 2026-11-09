import mongoose from 'mongoose';
import { connectDatabase, databaseStatus, disconnectDatabase } from '../config/database.js';
import { safeErrorMessage } from '../lib/safe-log.js';
import Admin from '../models/Admin.js';
import Coupon from '../models/Coupon.js';
import Customer from '../models/Customer.js';
import Inventory from '../models/Inventory.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import StripeEvent from '../models/StripeEvent.js';

async function check() {
  await connectDatabase();
  const ping = await mongoose.connection.db.admin().ping();

  await Promise.all([
    Admin.createIndexes(),
    Coupon.createIndexes(),
    Customer.createIndexes(),
    Inventory.createIndexes(),
    Order.createIndexes(),
    Product.createIndexes(),
    StripeEvent.createIndexes(),
  ]);

  const [products, orders, customers, admins, coupons, inventory] = await Promise.all([
    Product.countDocuments({}),
    Order.countDocuments({}),
    Customer.countDocuments({}),
    Admin.countDocuments({}),
    Coupon.countDocuments({}),
    Inventory.countDocuments({}),
  ]);

  console.log('MongoDB connection OK.');
  console.log(`Ping: ${ping.ok === 1 ? 'ok' : 'unexpected response'}`);
  console.log(`Database: ${databaseStatus().database}`);
  console.log(
    `Collections: products=${products}, orders=${orders}, customers=${customers}, admins=${admins}, coupons=${coupons}, inventory=${inventory}`,
  );
}

check()
  .catch((error) => {
    console.error(`Database check failed: ${safeErrorMessage(error)}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase().catch(() => {});
  });
