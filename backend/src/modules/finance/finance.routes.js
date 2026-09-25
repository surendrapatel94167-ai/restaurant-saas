import express from 'express';
import * as controller from './finance.controller.js';
import authenticate from '../../middlewares/authenticate.js';
import authorizeRole from '../../middlewares/authorizeRole.js';
import requireActiveSubscription from '../../middlewares/requireActiveSubscription.js';

const router = express.Router();

router.use(authenticate, authorizeRole('hotel_admin', 'manager'), requireActiveSubscription);

router.get('/dashboard', controller.salesDashboard);
router.get('/pnl', controller.profitAndLoss);

router.get('/expenses', controller.listExpenses);
router.post('/expenses', controller.addExpense);

router.get('/vendors', controller.listVendors);
router.post('/vendors', controller.addVendor);
router.post('/vendors/:vendorId/transactions', controller.addVendorTransaction);

export default router;
