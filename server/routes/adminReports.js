import { Router } from 'express';
import Order from '../models/Order.js';
import { asyncHandler, badRequest } from '../lib/http.js';
import { clean } from '../lib/validation.js';

const router = Router();

const PERIODS = {
  daily: { format: '%Y-%m-%d', defaultDays: 30, maxDays: 90 },
  weekly: { format: '%G-W%V', defaultDays: 90, maxDays: 365 },
  monthly: { format: '%Y-%m', defaultDays: 365, maxDays: 730 },
};

const activeOrder = { orderStatus: { $ne: 'cancelled' } };

// GET /api/admin/reports?period=daily|weekly|monthly&days=30
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const period = clean(req.query.period) || 'daily';
    const config = PERIODS[period];
    if (!config) {
      throw badRequest('Invalid report period.', {
        period: `period must be one of: ${Object.keys(PERIODS).join(', ')}.`,
      });
    }

    const requestedDays = Math.floor(Number(req.query.days)) || config.defaultDays;
    const days = Math.min(config.maxDays, Math.max(1, requestedDays));
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    from.setDate(from.getDate() - (days - 1));

    const groupedBy = {
      $dateToString: {
        format: config.format,
        date: '$createdAt',
        timezone: 'Asia/Kolkata',
      },
    };

    const [summaryRows, seriesRows, bestSellers, paymentBreakdown] = await Promise.all([
      Order.aggregate([
        { $match: { createdAt: { $gte: from } } },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            cancelledOrders: {
              $sum: { $cond: [{ $eq: ['$orderStatus', 'cancelled'] }, 1, 0] },
            },
            totalSales: {
              $sum: { $cond: [{ $ne: ['$orderStatus', 'cancelled'] }, '$totalAmount', 0] },
            },
            paidRevenue: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ['$orderStatus', 'cancelled'] },
                      { $eq: ['$paymentStatus', 'paid'] },
                    ],
                  },
                  '$totalAmount',
                  0,
                ],
              },
            },
          },
        },
      ]),
      Order.aggregate([
        { $match: { ...activeOrder, createdAt: { $gte: from } } },
        {
          $group: {
            _id: groupedBy,
            orders: { $sum: 1 },
            revenue: { $sum: '$totalAmount' },
            paidRevenue: {
              $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totalAmount', 0] },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([
        { $match: { ...activeOrder, createdAt: { $gte: from } } },
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
        { $sort: { revenue: -1, quantity: -1 } },
        { $limit: 10 },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: from } } },
        {
          $group: {
            _id: '$paymentStatus',
            count: { $sum: 1 },
            amount: { $sum: '$totalAmount' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const summary = summaryRows[0] || {
      totalOrders: 0,
      cancelledOrders: 0,
      totalSales: 0,
      paidRevenue: 0,
    };

    res.json({
      period,
      days,
      from: from.toISOString(),
      summary: {
        ...summary,
        averageOrderValue:
          summary.totalOrders > 0
            ? Math.round((summary.totalSales / summary.totalOrders) * 100) / 100
            : 0,
      },
      series: seriesRows.map((row) => ({
        period: row._id,
        orders: row.orders,
        revenue: row.revenue,
        paidRevenue: row.paidRevenue,
      })),
      bestSellers: bestSellers.map((row) => ({
        productId: row._id ? String(row._id) : null,
        slug: row.slug,
        name: row.name,
        quantity: row.quantity,
        revenue: row.revenue,
      })),
      paymentBreakdown: paymentBreakdown.map((row) => ({
        status: row._id,
        count: row.count,
        amount: row.amount,
      })),
    });
  }),
);

export default router;
