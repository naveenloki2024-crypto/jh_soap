import { Router } from 'express';
import adminCouponsRouter from './adminCoupons.js';
import adminCustomersRouter from './adminCustomers.js';
import adminDashboardRouter from './adminDashboard.js';
import adminHeroRouter from './adminHero.js';
import adminInventoryRouter from './adminInventory.js';
import adminOrdersRouter from './adminOrders.js';
import adminPaymentsRouter from './adminPayments.js';
import adminProductsRouter from './adminProducts.js';
import adminReportsRouter from './adminReports.js';
import adminUploadsRouter from './adminUploads.js';

const router = Router();

router.use('/orders', adminOrdersRouter);
router.use('/customers', adminCustomersRouter);
router.use('/coupons', adminCouponsRouter);
router.use('/hero', adminHeroRouter);
router.use('/inventory', adminInventoryRouter);
router.use('/products', adminProductsRouter);
router.use('/payments', adminPaymentsRouter);
router.use('/reports', adminReportsRouter);
router.use('/uploads', adminUploadsRouter);
router.use(adminDashboardRouter);

export default router;
