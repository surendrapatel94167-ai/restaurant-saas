import express from 'express';
import * as controller from './tenant.controller.js';
import authenticate from '../../middlewares/authenticate.js';
import authorizeRole from '../../middlewares/authorizeRole.js';

const router = express.Router();

router.use(authenticate, authorizeRole('hotel_admin', 'manager'));

router.get('/me', controller.getMine);
router.put('/me', controller.updateMine);
router.get('/billing/status', controller.getBillingStatus);
router.post('/billing/renew', controller.createRenewalPayment);
router.post('/billing/confirm', controller.confirmRenewalPayment);

export default router;
