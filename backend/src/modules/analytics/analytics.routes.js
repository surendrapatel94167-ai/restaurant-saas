import express from 'express';
import * as controller from './analytics.controller.js';
import authenticate from '../../middlewares/authenticate.js';
import authorizeRole from '../../middlewares/authorizeRole.js';
import requireActiveSubscription from '../../middlewares/requireActiveSubscription.js';

const router = express.Router();

router.use(authenticate, authorizeRole('hotel_admin', 'manager'), requireActiveSubscription);

router.get('/dashboard', controller.getDashboard);
router.get('/summary', controller.getSummary);
router.get('/revenue-trend', controller.getRevenueTrend);
router.get('/dish-performance', controller.getDishPerformance);
router.get('/peak-hours', controller.getPeakHours);

export default router;
