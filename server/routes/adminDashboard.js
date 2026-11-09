import { Router } from 'express';
import Customer from '../models/Customer.js';
import Inventory from '../models/Inventory.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { asyncHandler } from '../lib/http.js';
import { mapOrder } from '../lib/serialize.js';

const router = Router();

router.get(
  '/dashboard',
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(startOfDay);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const activeOrderFilter = { orderStatus: { $ne: 'cancelled' } };
    const pendingStatuses = ['received', 'confirmed', 'packed', 'shipped'];

    const [
      totalOrders,
      todayOrders,
      totalCustomers,
      totalProducts,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
      revenue,
      statusCounts,
      recentOrders,
      topSellingProducts,
      lowStockProducts,
      outOfStockProducts,
      salesByDay,
    ] = await Promise.all([
      Order.countDocuments({}),
      Order.countDocuments({ createdAt: { $gte: startOfDay } }),
      Customer.countDocuments({}),
      Product.countDocuments({ isActive: true }),
      Order.countDocuments({ orderStatus: { $in: pendingStatuses } }),
      Order.countDocuments({ orderStatus: 'delivered' }),
      Order.countDocuments({ orderStatus: 'cancelled' }),
      Order.aggregate([
        { $match: activeOrderFilter },
        {
          $group: {
            _id: null,
            totalSales: { $sum: '$totalAmount' },
            paidRevenue: {
              $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totalAmount', 0] },
            },
          },
        },
      ]),
      Order.aggregate([{ $group: { _id: '$orderStatus', count: { $sum: 1 } } }]),
      Order.find({}).sort({ createdAt: -1 }).limit(8),
      Order.aggregate([
        { $match: activeOrderFilter },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.productId',
            slug: { $first: '$items.slug' },
            name: { $first: '$items.name' },
            quantity: { $sum: '$items.quantity' },
            revenue: { $sum: '$items.lineTotal' },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 8 },
      ]),
      Inventory.countDocuments({ $expr: { $lte: ['$availableStock', '$lowStockThreshold'] } }),
      Product.countDocuments({ isActive: true, stockQuantity: 0 }),
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: sevenDaysAgo },
            ...activeOrderFilter,
          },
        },
        {
          $group: {
            _id: {$dateToString: { format: '%Y-%m-%d', date: '$createdAt' }},
            orders: { $sum: 1 },
            revenue: { $sum: '$totalAmount' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const salesAnalytics = [];
    for (let index = 0; index < 7; index += 1) {
      const day = new Date(sevenDaysAgo);
      day.setDate(day.getDate() + index);
      const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(
        day.getDate(),
      ).padStart(2, '0')}`;
      const found = salesByDay.find((row) => row._id === key);
      salesAnalytics.push({
        date: key,
        orders: found?.orders || 0,
        revenue: found?.revenue || 0,
      });
    }

    const statusBreakdown = statusCounts.reduce((acc, row) => {
      acc[row._id] = row.count;
      return acc;
    }, {});

    res.json({
      totalOrders,
      todayOrders,
      totalCustomers,
      totalProducts,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
      totalSales: revenue[0]?.totalSales || 0,
      totalRevenue: revenue[0]?.paidRevenue || 0,
      lowStockProducts,
      outOfStockProducts,
      statusBreakdown,
      recentOrders: recentOrders.map((order) => mapOrder(order)),
      topSellingProducts: topSellingProducts.map((product) => ({
        productId: product._id ? String(product._id) : null,
        slug: product.slug,
        name: product.name,
        quantity: product.quantity,
        revenue: product.revenue,
      })),
      salesAnalytics,
      recentNotifications: [],
      unreadNotificationCount: 0,
    });
  }),
);

export default router;
