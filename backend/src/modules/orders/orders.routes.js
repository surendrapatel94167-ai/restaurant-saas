import express from 'express';
import * as controller from './orders.controller.js';
import authenticate from '../../middlewares/authenticate.js';
import authorizeRole from '../../middlewares/authorizeRole.js';

const router = express.Router();

router.use(authenticate);

router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.patch('/:id/confirm', authorizeRole('hotel_admin', 'manager'), controller.confirmOrder);
router.patch('/:id/mark-paid', authorizeRole('hotel_admin', 'manager'), controller.markPaymentPaid);
router.patch('/:id/assistance/:requestId/resolve', controller.resolveAssistance);

export default router;
